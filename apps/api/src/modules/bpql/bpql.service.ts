import { BadRequestException, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CACHE_TTLS, CacheService } from '../../core/cache/cache.service';
import {
  assertFound,
  type ListResult,
} from '../../core/common/crud/crud.helpers';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { BpqlRowDto } from './dto/bpql-row.dto';
import { CreateBpqlChartDto } from './dto/create-bpql-chart.dto';
import { CreateBpqlSavedQueryDto } from './dto/create-bpql-saved-query.dto';
import { CreateBpqlTableDto } from './dto/create-bpql-table.dto';
import { QueryBpqlRowsDto } from './dto/query-bpql-rows.dto';
import { RunBpqlAggregateQueryDto } from './dto/run-bpql-aggregate-query.dto';
import { RunBpqlQueryDto } from './dto/run-bpql-query.dto';
import { UpdateBpqlChartDto } from './dto/update-bpql-chart.dto';
import { UpdateBpqlSavedQueryDto } from './dto/update-bpql-saved-query.dto';
import { UpdateBpqlTableDto } from './dto/update-bpql-table.dto';
import {
  bpqlChart,
  type BpqlAggFunction,
  type BpqlChartPlacement,
} from './entities/bpql-chart';
import type { BpqlWhereClause } from './entities/bpql-query-types';
import { bpqlSavedQuery } from './entities/bpql-saved-query';
import { type BpqlFieldDefinition, bpqlTable } from './entities/bpql-table';
import { type BpqlRowData, bpqlRow } from './entities/bpql-row';

const RESERVED_TABLE_SLUGS = new Set(['tables', 'query', 'schema']);

// BpqlWhereDto (a validated incoming request DTO) is always assignable to
// this looser shape, which is also what the stored jsonb `where` columns
// deserialize to — one type for both call sites instead of casting.
type BpqlQueryFilter = { search?: string; where?: BpqlWhereClause[] };

type AggregateResultRow = { group: string | null; value: number };

function normalizeFields(fields: BpqlFieldDefinition[]): BpqlFieldDefinition[] {
  const seen = new Set<string>();
  return fields.map((field) => {
    if (seen.has(field.key)) {
      throw new BadRequestException(`Duplicate field key: ${field.key}`);
    }
    seen.add(field.key);
    return {
      key: field.key,
      label: field.label.trim(),
      type: field.type,
      required: Boolean(field.required),
      options:
        field.type === 'select'
          ? Array.from(
              new Set(
                (field.options ?? [])
                  .map((item) => item.trim())
                  .filter(Boolean),
              ),
            )
          : [],
    };
  });
}

function validateTableSlug(slug: string) {
  if (RESERVED_TABLE_SLUGS.has(slug)) {
    throw new BadRequestException(`"${slug}" is reserved`);
  }
}

@Injectable()
export class BpqlService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly cache?: CacheService,
  ) {}

  listTables(tenant: TenantContext) {
    return this.remember(tenant, 'bpql:tables', CACHE_TTLS.medium, () =>
      this.tenantDb.withTenantDb(tenant, (db) =>
        db.select().from(bpqlTable).orderBy(asc(bpqlTable.name)),
      ),
    );
  }

  async findTable(tenant: TenantContext, slug: string) {
    const row = await this.remember(
      tenant,
      `bpql:table:${slug}`,
      CACHE_TTLS.medium,
      async () => {
        const [found] = await this.tenantDb.withTenantDb(tenant, (db) =>
          db.select().from(bpqlTable).where(eq(bpqlTable.slug, slug)).limit(1),
        );
        return found;
      },
    );
    return assertFound(row, 'BPQL table');
  }

  async createTable(tenant: TenantContext, dto: CreateBpqlTableDto) {
    validateTableSlug(dto.slug);
    const fields = normalizeFields(dto.fields);
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(bpqlTable)
        .values({
          name: dto.name.trim(),
          slug: dto.slug.trim(),
          description: dto.description?.trim() ?? '',
          fields,
        })
        .returning(),
    );
    await this.invalidateTableMetadata(tenant);
    return row;
  }

  async updateTable(
    tenant: TenantContext,
    slug: string,
    dto: UpdateBpqlTableDto,
  ) {
    if (dto.slug) validateTableSlug(dto.slug);
    const values = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      ...(dto.fields !== undefined
        ? { fields: normalizeFields(dto.fields) }
        : {}),
      updatedAt: new Date(),
    };
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(bpqlTable)
        .set(values)
        .where(eq(bpqlTable.slug, slug))
        .returning(),
    );
    await this.invalidateTableMetadata(tenant);
    return assertFound(row, 'BPQL table');
  }

  async removeTable(tenant: TenantContext, slug: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .delete(bpqlTable)
        .where(eq(bpqlTable.slug, slug))
        .returning({ id: bpqlTable.id }),
    );
    assertFound(row, 'BPQL table');
    await this.invalidateTableMetadata(tenant);
    return { ok: true as const };
  }

  async listRows(
    tenant: TenantContext,
    tableSlug: string,
    query: QueryBpqlRowsDto = {},
  ): Promise<ListResult<typeof bpqlRow.$inferSelect>> {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [table] = await db
        .select()
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, tableSlug))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      const where = this.buildRowWhere(found.id, found.fields, query);
      const limit = query.limit ?? 50;
      const offset = query.offset ?? 0;
      const rows = await db
        .select()
        .from(bpqlRow)
        .where(where)
        .orderBy(desc(bpqlRow.updatedAt))
        .limit(limit)
        .offset(offset);
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(bpqlRow)
        .where(where);
      return { rows, total, limit, offset };
    });
  }

  async createRow(tenant: TenantContext, tableSlug: string, dto: BpqlRowDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [table] = await db
        .select()
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, tableSlug))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      const data = this.normalizeRowData(found.fields, dto.data);
      const [row] = await db
        .insert(bpqlRow)
        .values({ tableId: found.id, data })
        .returning();
      return row;
    });
  }

  async updateRow(
    tenant: TenantContext,
    tableSlug: string,
    rowId: string,
    dto: BpqlRowDto,
  ) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [table] = await db
        .select()
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, tableSlug))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      const data = this.normalizeRowData(found.fields, dto.data);
      const [row] = await db
        .update(bpqlRow)
        .set({ data, updatedAt: new Date() })
        .where(and(eq(bpqlRow.id, rowId), eq(bpqlRow.tableId, found.id)))
        .returning();
      return assertFound(row, 'BPQL row');
    });
  }

  async removeRow(tenant: TenantContext, tableSlug: string, rowId: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [table] = await db
        .select({ id: bpqlTable.id })
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, tableSlug))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      const [row] = await db
        .delete(bpqlRow)
        .where(and(eq(bpqlRow.id, rowId), eq(bpqlRow.tableId, found.id)))
        .returning({ id: bpqlRow.id });
      assertFound(row, 'BPQL row');
      return { ok: true as const };
    });
  }

  runQuery(tenant: TenantContext, dto: RunBpqlQueryDto) {
    return this.listRows(tenant, dto.table, dto);
  }

  // --- saved queries: named, reusable filter/sort/column selections ---

  listSavedQueries(tenant: TenantContext, tableSlug?: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      if (!tableSlug) {
        return db
          .select()
          .from(bpqlSavedQuery)
          .orderBy(desc(bpqlSavedQuery.updatedAt));
      }
      const [table] = await db
        .select({ id: bpqlTable.id })
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, tableSlug))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      return db
        .select()
        .from(bpqlSavedQuery)
        .where(eq(bpqlSavedQuery.tableId, found.id))
        .orderBy(desc(bpqlSavedQuery.updatedAt));
    });
  }

  async createSavedQuery(tenant: TenantContext, dto: CreateBpqlSavedQueryDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [table] = await db
        .select({ id: bpqlTable.id, fields: bpqlTable.fields })
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, dto.table))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      this.assertKnownFields(found.fields, dto.where, dto.sortBy, dto.columns);
      const [row] = await db
        .insert(bpqlSavedQuery)
        .values({
          tableId: found.id,
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
          search: dto.search?.trim() || null,
          where: dto.where ?? [],
          sortBy: dto.sortBy,
          sortDir: dto.sortDir,
          columns: dto.columns ?? null,
          createdBy: tenant.userId,
        })
        .returning();
      return row;
    });
  }

  async updateSavedQuery(
    tenant: TenantContext,
    id: string,
    dto: UpdateBpqlSavedQueryDto,
  ) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .update(bpqlSavedQuery)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.search !== undefined
            ? { search: dto.search.trim() || null }
            : {}),
          ...(dto.where !== undefined ? { where: dto.where } : {}),
          ...(dto.sortBy !== undefined ? { sortBy: dto.sortBy } : {}),
          ...(dto.sortDir !== undefined ? { sortDir: dto.sortDir } : {}),
          ...(dto.columns !== undefined ? { columns: dto.columns } : {}),
          updatedAt: new Date(),
        })
        .where(eq(bpqlSavedQuery.id, id))
        .returning();
      return assertFound(row, 'BPQL saved query');
    });
  }

  async deleteSavedQuery(tenant: TenantContext, id: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .delete(bpqlSavedQuery)
        .where(eq(bpqlSavedQuery.id, id))
        .returning({ id: bpqlSavedQuery.id });
      assertFound(row, 'BPQL saved query');
      return { ok: true as const };
    });
  }

  // --- charts: aggregated views (bar/line/area/pie/number/table) over a table ---

  listCharts(
    tenant: TenantContext,
    filter: { placement?: BpqlChartPlacement; table?: string } = {},
  ) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const conditions: SQL[] = [];
      if (filter.placement)
        conditions.push(eq(bpqlChart.placement, filter.placement));
      if (filter.table) {
        const [table] = await db
          .select({ id: bpqlTable.id })
          .from(bpqlTable)
          .where(eq(bpqlTable.slug, filter.table))
          .limit(1);
        conditions.push(
          eq(bpqlChart.tableId, assertFound(table, 'BPQL table').id),
        );
      }
      return db
        .select()
        .from(bpqlChart)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(bpqlChart.order), asc(bpqlChart.createdAt));
    });
  }

  async createChart(tenant: TenantContext, dto: CreateBpqlChartDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [table] = await db
        .select({ id: bpqlTable.id, fields: bpqlTable.fields })
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, dto.table))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      this.assertKnownFields(
        found.fields,
        dto.where,
        dto.groupByField,
        dto.metricField ? [dto.metricField] : undefined,
      );
      this.assertNumericMetricField(
        found.fields,
        dto.aggFunction,
        dto.metricField,
      );
      if (dto.aggFunction !== 'count' && !dto.metricField) {
        throw new BadRequestException(
          `metricField is required for aggFunction "${dto.aggFunction}"`,
        );
      }
      const [row] = await db
        .insert(bpqlChart)
        .values({
          tableId: found.id,
          savedQueryId: dto.savedQueryId,
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
          chartType: dto.chartType,
          groupByField: dto.groupByField,
          metricField: dto.metricField,
          aggFunction: dto.aggFunction,
          search: dto.search?.trim() || null,
          where: dto.where ?? [],
          groupLimit: dto.groupLimit ?? 10,
          placement: dto.placement ?? 'bpql',
          order: dto.order ?? 0,
          color: dto.color,
          createdBy: tenant.userId,
        })
        .returning();
      return row;
    });
  }

  async updateChart(
    tenant: TenantContext,
    id: string,
    dto: UpdateBpqlChartDto,
  ) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .update(bpqlChart)
        .set({
          ...(dto.savedQueryId !== undefined
            ? { savedQueryId: dto.savedQueryId }
            : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.chartType !== undefined ? { chartType: dto.chartType } : {}),
          ...(dto.groupByField !== undefined
            ? { groupByField: dto.groupByField }
            : {}),
          ...(dto.metricField !== undefined
            ? { metricField: dto.metricField }
            : {}),
          ...(dto.aggFunction !== undefined
            ? { aggFunction: dto.aggFunction }
            : {}),
          ...(dto.search !== undefined
            ? { search: dto.search.trim() || null }
            : {}),
          ...(dto.where !== undefined ? { where: dto.where } : {}),
          ...(dto.groupLimit !== undefined
            ? { groupLimit: dto.groupLimit }
            : {}),
          ...(dto.placement !== undefined ? { placement: dto.placement } : {}),
          ...(dto.order !== undefined ? { order: dto.order } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          updatedAt: new Date(),
        })
        .where(eq(bpqlChart.id, id))
        .returning();
      return assertFound(row, 'BPQL chart');
    });
  }

  async deleteChart(tenant: TenantContext, id: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .delete(bpqlChart)
        .where(eq(bpqlChart.id, id))
        .returning({ id: bpqlChart.id });
      assertFound(row, 'BPQL chart');
      return { ok: true as const };
    });
  }

  /** Ad hoc group-by/aggregate execution — used for live chart-builder previews. */
  runAggregateQuery(tenant: TenantContext, dto: RunBpqlAggregateQueryDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [table] = await db
        .select()
        .from(bpqlTable)
        .where(eq(bpqlTable.slug, dto.table))
        .limit(1);
      const found = assertFound(table, 'BPQL table');
      const rows = await this.executeAggregate(db, found, dto);
      return { rows, aggFunction: dto.aggFunction };
    });
  }

  /** Resolves a saved chart (and its linked saved query, if any) and runs it. */
  async getChartData(tenant: TenantContext, chartId: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [chart] = await db
        .select()
        .from(bpqlChart)
        .where(eq(bpqlChart.id, chartId))
        .limit(1);
      const foundChart = assertFound(chart, 'BPQL chart');
      const [table] = await db
        .select()
        .from(bpqlTable)
        .where(eq(bpqlTable.id, foundChart.tableId))
        .limit(1);
      const foundTable = assertFound(table, 'BPQL table');

      let search = foundChart.search ?? undefined;
      let where = foundChart.where;
      if (foundChart.savedQueryId) {
        const [savedQuery] = await db
          .select()
          .from(bpqlSavedQuery)
          .where(eq(bpqlSavedQuery.id, foundChart.savedQueryId))
          .limit(1);
        if (savedQuery) {
          search = savedQuery.search ?? undefined;
          where = savedQuery.where;
        }
      }

      const rows = await this.executeAggregate(db, foundTable, {
        groupByField: foundChart.groupByField ?? undefined,
        metricField: foundChart.metricField ?? undefined,
        aggFunction: foundChart.aggFunction,
        search,
        where,
        groupLimit: foundChart.groupLimit,
      });
      return { chart: foundChart, rows };
    });
  }

  private async executeAggregate(
    db: NodePgDatabase,
    table: typeof bpqlTable.$inferSelect,
    dto: {
      groupByField?: string;
      metricField?: string;
      aggFunction: BpqlAggFunction;
      search?: string;
      where?: BpqlWhereClause[];
      groupLimit?: number;
    },
  ): Promise<AggregateResultRow[]> {
    this.assertKnownFields(
      table.fields,
      dto.where,
      dto.groupByField,
      dto.metricField ? [dto.metricField] : undefined,
    );
    if (dto.aggFunction !== 'count' && !dto.metricField) {
      throw new BadRequestException(
        `metricField is required for aggFunction "${dto.aggFunction}"`,
      );
    }
    this.assertNumericMetricField(
      table.fields,
      dto.aggFunction,
      dto.metricField,
    );

    const where = this.buildRowWhere(table.id, table.fields, dto);
    const metricExpr = this.aggExpression(dto.aggFunction, dto.metricField);
    const groupLimit = dto.groupLimit ?? 10;

    if (dto.groupByField) {
      // Use sql.raw for the field key to avoid Postgres parameterized expression mismatch in GROUP BY
      const groupExpr = sql<string>`${bpqlRow.data}->>${sql.raw(`'${dto.groupByField}'`)}`;
      const rows = await db
        .select({ group: groupExpr, value: metricExpr })
        .from(bpqlRow)
        .where(where)
        .groupBy(groupExpr)
        .orderBy(desc(metricExpr))
        .limit(groupLimit);
      return rows.map((row) => ({
        group: row.group,
        value: Number(row.value),
      }));
    }

    const [row] = await db
      .select({ value: metricExpr })
      .from(bpqlRow)
      .where(where);
    return [{ group: null, value: Number(row?.value ?? 0) }];
  }

  private aggExpression(
    aggFunction: BpqlAggFunction,
    metricField?: string,
  ): SQL<number> {
    if (aggFunction === 'count') return sql<number>`count(*)::int`;
    const rawMetric = sql`nullif(${bpqlRow.data}->>${sql.raw(`'${metricField}'`)}, '')`;
    const metricExpr = sql`
      case
        when ${rawMetric} ~ '^-?[0-9]+(\\.[0-9]+)?$'
        then ${rawMetric}::numeric
        else null
      end
    `;
    if (aggFunction === 'sum')
      return sql<number>`coalesce(sum(${metricExpr}), 0)`;
    if (aggFunction === 'avg')
      return sql<number>`coalesce(avg(${metricExpr}), 0)`;
    if (aggFunction === 'min') return sql<number>`min(${metricExpr})`;
    return sql<number>`max(${metricExpr})`;
  }

  private assertNumericMetricField(
    fields: BpqlFieldDefinition[],
    aggFunction: BpqlAggFunction,
    metricField?: string,
  ): void {
    if (aggFunction === 'count' || !metricField) return;
    const field = fields.find((entry) => entry.key === metricField);
    if (field?.type !== 'number') {
      throw new BadRequestException(
        `Field "${metricField}" must be a number field for aggFunction "${aggFunction}"`,
      );
    }
  }

  private assertKnownFields(
    fields: BpqlFieldDefinition[],
    where?: BpqlWhereClause[],
    ...fieldNames: Array<string | string[] | undefined>
  ): void {
    const allowed = new Set(fields.map((field) => field.key));
    for (const clause of where ?? []) {
      if (!allowed.has(clause.field)) {
        throw new BadRequestException(`Unknown BPQL field: ${clause.field}`);
      }
    }
    for (const entry of fieldNames) {
      const names = Array.isArray(entry) ? entry : entry ? [entry] : [];
      for (const name of names) {
        if (!allowed.has(name)) {
          throw new BadRequestException(`Unknown BPQL field: ${name}`);
        }
      }
    }
  }

  private normalizeRowData(
    fields: BpqlFieldDefinition[],
    input: BpqlRowData,
  ): BpqlRowData {
    const output: BpqlRowData = {};
    for (const field of fields) {
      const value = input[field.key];
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        throw new BadRequestException(`${field.label} is required`);
      }
      if (value === undefined || value === null || value === '') {
        output[field.key] = null;
        continue;
      }
      if (field.type === 'number') {
        const numberValue =
          typeof value === 'number' ? value : Number.parseFloat(String(value));
        if (Number.isNaN(numberValue)) {
          throw new BadRequestException(`${field.label} must be a number`);
        }
        output[field.key] = numberValue;
      } else if (field.type === 'boolean') {
        output[field.key] = value === true || value === 'true' || value === '1';
      } else if (field.type === 'select') {
        const textValue = String(value);
        if (field.options?.length && !field.options.includes(textValue)) {
          throw new BadRequestException(`${field.label} has an invalid option`);
        }
        output[field.key] = textValue;
      } else {
        output[field.key] = String(value);
      }
    }
    return output;
  }

  private buildRowWhere(
    tableId: string,
    fields: BpqlFieldDefinition[],
    query: BpqlQueryFilter,
  ): SQL {
    const conditions: SQL[] = [eq(bpqlRow.tableId, tableId)];
    const allowedFields = new Set(fields.map((field) => field.key));
    if (query.search?.trim()) {
      conditions.push(
        sql`${bpqlRow.data}::text ILIKE ${`%${query.search.trim()}%`}`,
      );
    }
    for (const clause of query.where ?? []) {
      if (!allowedFields.has(clause.field)) {
        throw new BadRequestException(`Unknown BPQL field: ${clause.field}`);
      }
      conditions.push(this.buildFieldCondition(clause));
    }
    return and(...conditions)!;
  }

  private buildFieldCondition(clause: BpqlWhereClause): SQL {
    const value = clause.value ?? '';
    const fieldValue = sql`${bpqlRow.data}->>${clause.field}`;
    if (clause.operator === 'equals') return sql`${fieldValue} = ${value}`;
    if (clause.operator === 'notEquals') return ne(fieldValue, value);
    if (clause.operator === 'contains')
      return sql`${fieldValue} ILIKE ${`%${value}%`}`;
    if (clause.operator === 'blank')
      return sql`(${fieldValue} IS NULL OR ${fieldValue} = '')`;
    if (clause.operator === 'notBlank')
      return sql`(${fieldValue} IS NOT NULL AND ${fieldValue} <> '')`;

    // Numeric comparisons — the value and the stored field are both cast
    // to numeric, so a non-numeric field/value simply never matches
    // (Postgres would error on an invalid cast otherwise) rather than
    // throwing a 500 for a mismatched field type.
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      throw new BadRequestException(
        `Value for "${clause.field}" must be numeric to use operator "${clause.operator}"`,
      );
    }
    const rawField = sql`nullif(${fieldValue}, '')`;
    const numericField = sql`
      case
        when ${rawField} ~ '^-?[0-9]+(\\.[0-9]+)?$'
        then ${rawField}::numeric
        else null
      end
    `;
    if (clause.operator === 'greaterThan')
      return sql`${numericField} > ${numericValue}`;
    if (clause.operator === 'greaterOrEqual')
      return sql`${numericField} >= ${numericValue}`;
    if (clause.operator === 'lessThan')
      return sql`${numericField} < ${numericValue}`;
    return sql`${numericField} <= ${numericValue}`;
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

  private async invalidateTableMetadata(tenant: TenantContext): Promise<void> {
    await this.cache?.deleteByPattern(this.cacheKey(tenant, 'bpql:*'));
  }
}
