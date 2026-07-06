import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { assertFound, listAndCount } from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { TenantDbService } from '../../core/database/tenant-db.service';
import { UsersService } from '../../core/users/users.service';
import { MembershipsService } from '../../core/tenants/memberships.service';
import { DepartmentsService } from '../departments/departments.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeCustomFieldsService } from './employee-custom-fields.service';
import { employee } from './entities/employee';
import { employeeManagerHistory } from './entities/employee-manager-history';

const listConfig: ListQueryConfig = {
  fields: {
    name: employee.name,
    phone: employee.phone,
    email: employee.email,
    departmentId: employee.departmentId,
    managerId: employee.managerId,
    createdAt: employee.createdAt,
  },
  searchFields: ['name', 'phone', 'email'],
  customFieldsColumn: employee.customFields,
  defaultSort: { field: 'createdAt', direction: 'desc' },
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly departmentsService: DepartmentsService,
    private readonly customFieldsService: EmployeeCustomFieldsService,
    private readonly usersService: UsersService,
    private readonly membershipsService: MembershipsService,
  ) {}

  findAll(tenant: TenantContext, query: QueryEmployeesDto) {
    const extra = query.departmentId
      ? [eq(employee.departmentId, query.departmentId)]
      : [];
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, employee, query, listConfig, extra),
    );
  }

  async findOne(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.select().from(employee).where(eq(employee.id, id)).limit(1),
    );
    return assertFound(row, 'Employee');
  }

  async create(tenant: TenantContext, dto: CreateEmployeeDto) {
    const values = {
      ...dto,
      customFields: await this.sanitizeCustomFields(
        tenant,
        dto.customFields ?? {},
      ),
    };
    await this.assertDepartmentExists(tenant, dto.departmentId);
    await this.assertManagerExists(tenant, dto.managerId);
    const row = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [newRow] = await db.insert(employee).values(values).returning();
      if (values.managerId) {
        await db.insert(employeeManagerHistory).values({
          employeeId: newRow.id,
          oldManagerId: null,
          newManagerId: values.managerId,
        });
      }
      return newRow;
    });

    // Auto-provision a system user for the employee
    try {
      let user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        // Generate a random password for new users
        // Since this is auto-provisioned, they will likely use "Forgot Password" or SSO
        // For local auth, setting a default that is complex enough to pass validation
        const defaultPassword =
          'Auto' + Math.random().toString(36).substring(2, 10) + 'A1!';
        user = await this.usersService.createWithPassword({
          email: dto.email,
          fullName: dto.name,
          password: defaultPassword,
        });
      }

      await this.membershipsService.createMembership({
        tenantId: tenant.tenantId,
        userId: user.id,
        role: 'member',
        status: 'active',
      });
    } catch (err) {
      // If user creation fails, we still return the employee row
      // We log it but do not fail the employee creation request entirely
      console.error('Failed to auto-provision user for employee:', err);
    }

    return row;
  }

  async update(tenant: TenantContext, id: string, dto: UpdateEmployeeDto) {
    await this.assertDepartmentExists(tenant, dto.departmentId);
    await this.assertManagerExists(tenant, dto.managerId, id);
    const { customFields, ...columns } = dto;
    const patch: Record<string, unknown> = {
      ...columns,
      updatedAt: new Date(),
    };
    if (customFields !== undefined) {
      const clean = await this.sanitizeCustomFields(tenant, customFields);
      // Merge (jsonb ||) rather than replace so a single inline cell edit
      // doesn't wipe the row's other custom values.
      patch.customFields = sql`${employee.customFields} || ${JSON.stringify(clean)}::jsonb`;
    }
    const row = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [current] = await db
        .select({ managerId: employee.managerId })
        .from(employee)
        .where(eq(employee.id, id))
        .limit(1);

      const [updatedRow] = await db
        .update(employee)
        .set(patch)
        .where(eq(employee.id, id))
        .returning();

      const oldManagerId = current?.managerId ?? null;
      const newManagerId =
        dto.managerId === undefined ? oldManagerId : (dto.managerId ?? null);
      if (oldManagerId !== newManagerId) {
        await db.insert(employeeManagerHistory).values({
          employeeId: id,
          oldManagerId,
          newManagerId,
        });
      }
      return updatedRow;
    });
    return assertFound(row, 'Employee');
  }

  async remove(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .delete(employee)
        .where(eq(employee.id, id))
        .returning({ id: employee.id }),
    );
    assertFound(row, 'Employee');
    return { ok: true };
  }

  private async assertDepartmentExists(
    tenant: TenantContext,
    departmentId: string | null | undefined,
  ) {
    if (!departmentId) return;
    try {
      await this.departmentsService.findOne(tenant, departmentId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new BadRequestException('Department not found');
      }
      throw err;
    }
  }

  private async assertManagerExists(
    tenant: TenantContext,
    managerId: string | null | undefined,
    employeeId?: string,
  ) {
    if (!managerId) return;
    if (employeeId && managerId === employeeId) {
      throw new BadRequestException('An employee cannot be their own manager');
    }
    try {
      await this.findOne(tenant, managerId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new BadRequestException('Manager not found');
      }
      throw err;
    }
  }

  /** Keeps only values for defined custom fields, coerced to strings. */
  private async sanitizeCustomFields(
    tenant: TenantContext,
    values: Record<string, string>,
  ): Promise<Record<string, string>> {
    const entries = Object.entries(values);
    if (entries.length === 0) return {};
    const definitions = await this.customFieldsService.findAll(tenant);
    const known = new Set(definitions.map((definition) => definition.fieldKey));
    return Object.fromEntries(
      entries
        .filter(([key]) => known.has(key))
        .map(([key, value]) => [key, value == null ? '' : String(value)]),
    );
  }
}
