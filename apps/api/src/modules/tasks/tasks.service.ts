import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CACHE_TTLS, CacheService } from '../../core/cache/cache.service';
import { assertFound, listAndCount } from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskCustomFieldDto } from './dto/create-task-custom-field.dto';
import { CreateTaskProjectDto } from './dto/create-task-project.dto';
import { CreateTaskSprintDto } from './dto/create-task-sprint.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskCustomFieldDto } from './dto/update-task-custom-field.dto';
import { UpdateTaskProjectDto } from './dto/update-task-project.dto';
import { UpdateTaskSprintDto } from './dto/update-task-sprint.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { taskActivity } from './entities/task-activity';
import { taskComment } from './entities/task-comment';
import { taskCustomField } from './entities/task-custom-field';
import { taskProject } from './entities/task-project';
import { taskSprint } from './entities/task-sprint';
import { task } from './entities/task';

const listConfig: ListQueryConfig = {
  fields: {
    taskKey: task.taskKey,
    projectId: task.projectId,
    sprintId: task.sprintId,
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  },
  searchFields: ['taskKey', 'title', 'description'],
  customFieldsColumn: task.customFields,
  defaultSort: { field: 'updatedAt', direction: 'desc' },
};

function slugify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'field'
  );
}

function unique(values: string[] | undefined): string[] {
  return Array.from(new Set(values ?? []));
}

function normalizeProjectCode(code: string): string {
  return code.trim().toUpperCase();
}

function formatTaskKey(projectCode: string, sequence: number): string {
  return `${projectCode}-${String(sequence).padStart(6, '0')}`;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly cache?: CacheService,
  ) {}

  listProjects(tenant: TenantContext) {
    return this.remember(tenant, 'tasks:projects', CACHE_TTLS.medium, () =>
      this.tenantDb.withTenantDb(tenant, (db) =>
        db.select().from(taskProject).orderBy(asc(taskProject.name)),
      ),
    );
  }

  async createProject(tenant: TenantContext, dto: CreateTaskProjectDto) {
    const row = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const code = normalizeProjectCode(dto.code);
      const [existing] = await db
        .select({ id: taskProject.id })
        .from(taskProject)
        .where(eq(taskProject.code, code))
        .limit(1);
      if (existing) throw new ConflictException('Project code already exists');
      const [row] = await db
        .insert(taskProject)
        .values({
          name: dto.name.trim(),
          code,
          description: dto.description?.trim() ?? '',
        })
        .returning();
      return row;
    });
    await this.invalidateTaskMetadata(tenant);
    return row;
  }

  async updateProject(
    tenant: TenantContext,
    id: string,
    dto: UpdateTaskProjectDto,
  ) {
    const values = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code !== undefined
        ? { code: normalizeProjectCode(dto.code) }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      updatedAt: new Date(),
    };
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(taskProject)
        .set(values)
        .where(eq(taskProject.id, id))
        .returning(),
    );
    await this.invalidateTaskMetadata(tenant);
    return assertFound(row, 'Task project');
  }

  findAll(tenant: TenantContext, query: QueryTasksDto) {
    const extra: SQL[] = [];
    if (query.projectId) extra.push(eq(task.projectId, query.projectId));
    if (query.sprintId) extra.push(eq(task.sprintId, query.sprintId));
    if (query.status) extra.push(eq(task.status, query.status));
    if (query.type) extra.push(eq(task.type, query.type));
    if (query.assigneeId)
      extra.push(sql`${task.assigneeIds} ? ${query.assigneeId}`);
    if (query.watcherId)
      extra.push(sql`${task.watcherIds} ? ${query.watcherId}`);
    if (query.label) extra.push(sql`${task.labels} ? ${query.label}`);
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, task, query, listConfig, extra),
    );
  }

  async findOne(tenant: TenantContext, id: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .select()
        .from(task)
        .where(eq(task.id, id))
        .limit(1);
      return this.withDetail(db, assertFound(row, 'Task'));
    });
  }

  async findByKey(tenant: TenantContext, taskKey: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .select()
        .from(task)
        .where(eq(task.taskKey, taskKey.toUpperCase()))
        .limit(1);
      return this.withDetail(db, assertFound(row, 'Task'));
    });
  }

  private async withDetail(
    db: NodePgDatabase,
    found: typeof task.$inferSelect,
  ) {
    const [comments, activity, customFields] = await Promise.all([
      db
        .select()
        .from(taskComment)
        .where(eq(taskComment.taskId, found.id))
        .orderBy(asc(taskComment.createdAt)),
      db
        .select()
        .from(taskActivity)
        .where(eq(taskActivity.taskId, found.id))
        .orderBy(asc(taskActivity.createdAt)),
      db
        .select()
        .from(taskCustomField)
        .where(eq(taskCustomField.projectId, found.projectId))
        .orderBy(asc(taskCustomField.createdAt)),
    ]);
    return {
      ...found,
      comments,
      activity,
      customFieldDefinitions: customFields,
    };
  }

  async create(tenant: TenantContext, dto: CreateTaskDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [project] = await db
        .select()
        .from(taskProject)
        .where(eq(taskProject.id, dto.projectId))
        .limit(1);
      if (!project) throw new NotFoundException('Task project not found');
      await this.assertSprintInProject(db, project.id, dto.sprintId ?? null);
      const [{ total }] = await db
        .select({ total: count(task.id) })
        .from(task)
        .where(eq(task.projectId, project.id));
      const taskKey = formatTaskKey(project.code, total + 1);
      const values = {
        ...this.normalizeInput(dto),
        customFields: await this.sanitizeCustomFields(
          db,
          project.id,
          dto.customFields ?? {},
        ),
      };
      const [row] = await db
        .insert(task)
        .values({
          ...values,
          projectId: project.id,
          taskKey,
          title: dto.title.trim(),
        })
        .returning();
      await db.insert(taskActivity).values({
        taskId: row.id,
        actorUserId: tenant.userId,
        action: 'created',
        message: `Created ${row.taskKey}`,
      });
      return row;
    });
  }

  async update(tenant: TenantContext, id: string, dto: UpdateTaskDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [before] = await db
        .select()
        .from(task)
        .where(eq(task.id, id))
        .limit(1);
      if (!before) throw new NotFoundException('Task not found');
      const nextProjectId = dto.projectId ?? before.projectId;
      if (dto.projectId !== undefined && dto.projectId !== before.projectId) {
        const [project] = await db
          .select({ id: taskProject.id })
          .from(taskProject)
          .where(eq(taskProject.id, dto.projectId))
          .limit(1);
        if (!project) throw new NotFoundException('Task project not found');
      }
      await this.assertSprintInProject(
        db,
        nextProjectId,
        dto.sprintId === undefined ? before.sprintId : dto.sprintId,
      );
      const shouldSanitizeCustomFields =
        dto.customFields !== undefined ||
        (dto.projectId !== undefined && dto.projectId !== before.projectId);
      const values = {
        ...this.normalizeInput(dto),
        ...(shouldSanitizeCustomFields
          ? {
              customFields: await this.sanitizeCustomFields(
                db,
                nextProjectId,
                dto.customFields ?? before.customFields,
              ),
            }
          : {}),
      };
      const [row] = await db
        .update(task)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(task.id, id))
        .returning();
      await db.insert(taskActivity).values({
        taskId: id,
        actorUserId: tenant.userId,
        action: 'updated',
        message: this.describeUpdate(before, row),
        metadata: { beforeStatus: before.status, afterStatus: row.status },
      });
      return row;
    });
  }

  async remove(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.delete(task).where(eq(task.id, id)).returning({ id: task.id }),
    );
    assertFound(row, 'Task');
    return { ok: true };
  }

  async addComment(
    tenant: TenantContext,
    taskId: string,
    dto: CreateTaskCommentDto,
  ) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [existing] = await db
        .select({ id: task.id })
        .from(task)
        .where(eq(task.id, taskId))
        .limit(1);
      if (!existing) throw new NotFoundException('Task not found');
      const [comment] = await db
        .insert(taskComment)
        .values({ taskId, authorUserId: tenant.userId, body: dto.body.trim() })
        .returning();
      await db.insert(taskActivity).values({
        taskId,
        actorUserId: tenant.userId,
        action: 'commented',
        message: 'Added a comment',
        metadata: { commentId: comment.id },
      });
      return comment;
    });
  }

  async listSprints(tenant: TenantContext, projectId?: string) {
    return this.tenantDb.withTenantDb(tenant, (db) => {
      if (projectId) {
        return db
          .select()
          .from(taskSprint)
          .where(eq(taskSprint.projectId, projectId))
          .orderBy(asc(taskSprint.createdAt));
      }
      return db.select().from(taskSprint).orderBy(asc(taskSprint.createdAt));
    });
  }

  async createSprint(tenant: TenantContext, dto: CreateTaskSprintDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [project] = await db
        .select({ id: taskProject.id })
        .from(taskProject)
        .where(eq(taskProject.id, dto.projectId))
        .limit(1);
      if (!project) throw new NotFoundException('Task project not found');
      const [row] = await db
        .insert(taskSprint)
        .values({
          projectId: dto.projectId,
          name: dto.name.trim(),
          goal: dto.goal?.trim() ?? '',
          status: dto.status ?? 'planned',
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        })
        .returning();
      return row;
    });
  }

  async updateSprint(
    tenant: TenantContext,
    id: string,
    dto: UpdateTaskSprintDto,
  ) {
    const [row] = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [before] = await db
        .select()
        .from(taskSprint)
        .where(eq(taskSprint.id, id))
        .limit(1);
      if (!before) throw new NotFoundException('Task sprint not found');
      if (dto.projectId !== undefined) {
        const [project] = await db
          .select({ id: taskProject.id })
          .from(taskProject)
          .where(eq(taskProject.id, dto.projectId))
          .limit(1);
        if (!project) throw new NotFoundException('Task project not found');
      }
      const updated = await db
        .update(taskSprint)
        .set({
          ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.goal !== undefined ? { goal: dto.goal.trim() } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.startDate !== undefined
            ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
            : {}),
          ...(dto.endDate !== undefined
            ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(taskSprint.id, id))
        .returning();
      if (dto.projectId !== undefined && dto.projectId !== before.projectId) {
        await db
          .update(task)
          .set({ sprintId: null, updatedAt: new Date() })
          .where(eq(task.sprintId, id));
      }
      return updated;
    });
    return assertFound(row, 'Task sprint');
  }

  async removeSprint(tenant: TenantContext, id: string) {
    const result = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .delete(taskSprint)
        .where(eq(taskSprint.id, id))
        .returning({ id: taskSprint.id });
      if (!row) throw new NotFoundException('Task sprint not found');
      return { ok: true as const };
    });
    return result;
  }

  async listCustomFields(tenant: TenantContext, projectId?: string) {
    const key = projectId
      ? `tasks:custom-fields:${projectId}`
      : 'tasks:custom-fields';
    return this.remember(tenant, key, CACHE_TTLS.medium, () =>
      this.tenantDb.withTenantDb(tenant, (db) => {
        if (projectId) {
          return db
            .select()
            .from(taskCustomField)
            .where(eq(taskCustomField.projectId, projectId))
            .orderBy(asc(taskCustomField.createdAt));
        }
        return db
          .select()
          .from(taskCustomField)
          .orderBy(asc(taskCustomField.createdAt));
      }),
    );
  }

  async createCustomField(
    tenant: TenantContext,
    dto: CreateTaskCustomFieldDto,
  ) {
    const row = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [project] = await db
        .select({ id: taskProject.id })
        .from(taskProject)
        .where(eq(taskProject.id, dto.projectId))
        .limit(1);
      if (!project) throw new NotFoundException('Task project not found');
      const existing = await db
        .select({ fieldKey: taskCustomField.fieldKey })
        .from(taskCustomField)
        .where(eq(taskCustomField.projectId, dto.projectId));
      const taken = new Set(existing.map((row) => row.fieldKey));
      const base = slugify(dto.label);
      let fieldKey = base;
      for (let suffix = 2; taken.has(fieldKey); suffix += 1) {
        fieldKey = `${base}-${suffix}`;
      }
      const [row] = await db
        .insert(taskCustomField)
        .values({
          projectId: dto.projectId,
          fieldKey,
          label: dto.label.trim(),
          type: dto.type ?? 'text',
          options: dto.type === 'select' ? (dto.options ?? []) : [],
        })
        .returning();
      return row;
    });
    await this.invalidateTaskMetadata(tenant);
    return row;
  }

  async updateCustomField(
    tenant: TenantContext,
    id: string,
    dto: UpdateTaskCustomFieldDto,
  ) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(taskCustomField)
        .set({
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.options !== undefined ? { options: dto.options } : {}),
          updatedAt: new Date(),
        })
        .where(eq(taskCustomField.id, id))
        .returning(),
    );
    await this.invalidateTaskMetadata(tenant);
    return assertFound(row, 'Task custom field');
  }

  async removeCustomField(tenant: TenantContext, id: string) {
    const result = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .delete(taskCustomField)
        .where(eq(taskCustomField.id, id))
        .returning({
          fieldKey: taskCustomField.fieldKey,
          projectId: taskCustomField.projectId,
        });
      if (!row) throw new NotFoundException('Task custom field not found');
      await db
        .update(task)
        .set({ customFields: sql`${task.customFields} - ${row.fieldKey}` })
        .where(eq(task.projectId, row.projectId));
      return { ok: true as const };
    });
    await this.invalidateTaskMetadata(tenant);
    return result;
  }

  private cacheKey(tenant: TenantContext, key: string): string {
    return `tenant:${tenant.tenantId}:${key}`;
  }

  private async remember<T>(
    tenant: TenantContext,
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = this.cache?.remember(
      this.cacheKey(tenant, key),
      ttlSeconds,
      loader,
    );
    if (cached) return await cached;
    return await loader();
  }

  private async invalidateTaskMetadata(tenant: TenantContext): Promise<void> {
    await this.cache?.del(
      this.cacheKey(tenant, 'tasks:projects'),
      this.cacheKey(tenant, 'tasks:custom-fields'),
    );
    await this.cache?.deleteByPattern(
      this.cacheKey(tenant, 'tasks:custom-fields:*'),
    );
  }

  private normalizeInput(dto: Partial<CreateTaskDto>) {
    const assigneeIds = unique(dto.assigneeIds);
    const primaryAssigneeId = dto.primaryAssigneeId ?? assigneeIds[0] ?? null;
    const normalizedAssignees = primaryAssigneeId
      ? unique([primaryAssigneeId, ...assigneeIds])
      : assigneeIds;

    return {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
      ...(dto.sprintId !== undefined ? { sprintId: dto.sprintId } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.primaryAssigneeId !== undefined ? { primaryAssigneeId } : {}),
      ...(dto.assigneeIds !== undefined
        ? { assigneeIds: normalizedAssignees }
        : {}),
      ...(dto.watcherIds !== undefined
        ? { watcherIds: unique(dto.watcherIds) }
        : {}),
      ...(dto.labels !== undefined
        ? {
            labels: unique(
              dto.labels.map((label) => label.trim()).filter(Boolean),
            ),
          }
        : {}),
      ...(dto.dueDate !== undefined
        ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
        : {}),
    };
  }

  private async sanitizeCustomFields(
    db: NodePgDatabase,
    projectId: string,
    values: Record<string, unknown>,
  ): Promise<Record<string, string>> {
    const definitions = await db
      .select({ fieldKey: taskCustomField.fieldKey })
      .from(taskCustomField)
      .where(eq(taskCustomField.projectId, projectId));
    const allowed = new Set(definitions.map((field) => field.fieldKey));
    return Object.fromEntries(
      Object.entries(values)
        .filter(([key, value]) => allowed.has(key) && value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    );
  }

  private async assertSprintInProject(
    db: NodePgDatabase,
    projectId: string,
    sprintId: string | null | undefined,
  ): Promise<void> {
    if (!sprintId) return;
    const [sprint] = await db
      .select({ id: taskSprint.id })
      .from(taskSprint)
      .where(eq(taskSprint.id, sprintId))
      .limit(1);
    if (!sprint) throw new NotFoundException('Task sprint not found');
    const [projectSprint] = await db
      .select({ id: taskSprint.id })
      .from(taskSprint)
      .where(
        and(eq(taskSprint.id, sprintId), eq(taskSprint.projectId, projectId)),
      )
      .limit(1);
    if (!projectSprint) {
      throw new ConflictException('Sprint must belong to the task project');
    }
  }

  private describeUpdate(
    before: typeof task.$inferSelect,
    after: typeof task.$inferSelect,
  ) {
    const changes: string[] = [];
    if (before.status !== after.status)
      changes.push(`status ${before.status} -> ${after.status}`);
    if (before.priority !== after.priority)
      changes.push(`priority ${before.priority} -> ${after.priority}`);
    if (before.primaryAssigneeId !== after.primaryAssigneeId)
      changes.push('primary assignee changed');
    if (before.sprintId !== after.sprintId) changes.push('sprint changed');
    return changes.length ? `Updated ${changes.join(', ')}` : 'Updated task';
  }
}
