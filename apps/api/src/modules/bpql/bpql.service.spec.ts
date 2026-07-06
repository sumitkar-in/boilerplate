import { BadRequestException } from '@nestjs/common';
import { BpqlService } from './bpql.service';

type Chain = Record<string, jest.Mock> & {
  then: (
    resolve: (value: unknown) => unknown,
    reject: (err: unknown) => unknown,
  ) => Promise<unknown>;
};

function createDbMock() {
  const results: unknown[] = [];
  const queueResult = (value: unknown) => results.push(value);

  const makeChain = (): Chain => {
    const chain = {} as Chain;
    for (const method of [
      'from',
      'where',
      'orderBy',
      'groupBy',
      'limit',
      'offset',
      'values',
      'set',
      'returning',
    ]) {
      chain[method] = jest.fn(() => chain);
    }
    chain.then = (resolve, reject) => {
      const next = results.shift();
      if (next instanceof Error)
        return Promise.reject(next).then(resolve, reject);
      return Promise.resolve(next).then(resolve, reject);
    };
    return chain;
  };

  const db = {
    select: jest.fn(() => makeChain()),
    insert: jest.fn(() => makeChain()),
    update: jest.fn(() => makeChain()),
    delete: jest.fn(() => makeChain()),
  };
  return { db, queueResult };
}

function makeService(dbMock: ReturnType<typeof createDbMock>) {
  const tenantDb = {
    withTenantDb: jest.fn((_tenant: unknown, fn: (db: unknown) => unknown) =>
      fn(dbMock.db),
    ),
  };
  const service = new BpqlService(tenantDb as never);
  return { service, tenantDb };
}

const tenant = { tenantId: 't1', userId: 'u1' } as never;

const salesTable = {
  id: 'table-1',
  slug: 'sales',
  fields: [
    {
      key: 'region',
      label: 'Region',
      type: 'select',
      options: ['East', 'West'],
    },
    { key: 'amount', label: 'Amount', type: 'number' },
  ],
};

describe('BpqlService', () => {
  describe('createSavedQuery()', () => {
    it('resolves the table and inserts the saved query', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([salesTable]); // table lookup
      dbMock.queueResult([{ id: 'q1', name: 'West deals' }]); // insert .returning()
      const { service } = makeService(dbMock);

      const result = await service.createSavedQuery(tenant, {
        table: 'sales',
        name: 'West deals',
        where: [{ field: 'region', operator: 'equals', value: 'West' }],
      } as never);

      expect(result).toEqual({ id: 'q1', name: 'West deals' });
    });

    it('rejects a where clause referencing an unknown field', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([salesTable]);
      const { service } = makeService(dbMock);

      await expect(
        service.createSavedQuery(tenant, {
          table: 'sales',
          name: 'Bad query',
          where: [{ field: 'nope', operator: 'equals', value: 'x' }],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createChart()', () => {
    it('requires a metricField when aggFunction is not "count"', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([salesTable]);
      const { service } = makeService(dbMock);

      await expect(
        service.createChart(tenant, {
          table: 'sales',
          name: 'Total by region',
          chartType: 'bar',
          groupByField: 'region',
          aggFunction: 'sum',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires a number metric field when aggFunction is not "count"', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([salesTable]);
      const { service } = makeService(dbMock);

      await expect(
        service.createChart(tenant, {
          table: 'sales',
          name: 'Bad metric',
          chartType: 'bar',
          groupByField: 'region',
          metricField: 'region',
          aggFunction: 'sum',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a chart when the shape is valid', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([salesTable]);
      dbMock.queueResult([{ id: 'c1', name: 'Total by region' }]);
      const { service } = makeService(dbMock);

      const result = await service.createChart(tenant, {
        table: 'sales',
        name: 'Total by region',
        chartType: 'bar',
        groupByField: 'region',
        metricField: 'amount',
        aggFunction: 'sum',
      } as never);

      expect(result).toEqual({ id: 'c1', name: 'Total by region' });
    });
  });

  describe('runAggregateQuery()', () => {
    it('groups and aggregates rows, sorted by value descending', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([salesTable]); // table lookup
      dbMock.queueResult([
        { group: 'West', value: '500' },
        { group: 'East', value: '300' },
      ]); // grouped aggregate select
      const { service } = makeService(dbMock);

      const result = await service.runAggregateQuery(tenant, {
        table: 'sales',
        groupByField: 'region',
        metricField: 'amount',
        aggFunction: 'sum',
      } as never);

      expect(result).toEqual({
        aggFunction: 'sum',
        rows: [
          { group: 'West', value: 500 },
          { group: 'East', value: 300 },
        ],
      });
    });

    it('returns a single ungrouped row for a KPI-style count with no groupByField', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([salesTable]);
      dbMock.queueResult([{ value: '42' }]);
      const { service } = makeService(dbMock);

      const result = await service.runAggregateQuery(tenant, {
        table: 'sales',
        aggFunction: 'count',
      } as never);

      expect(result).toEqual({
        aggFunction: 'count',
        rows: [{ group: null, value: 42 }],
      });
    });
  });

  describe('getChartData()', () => {
    it('resolves the linked saved query filters before executing the aggregate', async () => {
      const dbMock = createDbMock();
      const chart = {
        id: 'c1',
        tableId: 'table-1',
        savedQueryId: 'q1',
        search: null,
        where: [],
        groupByField: 'region',
        metricField: 'amount',
        aggFunction: 'sum',
        groupLimit: 10,
      };
      dbMock.queueResult([chart]); // chart lookup
      dbMock.queueResult([salesTable]); // table lookup
      dbMock.queueResult([
        {
          search: null,
          where: [{ field: 'region', operator: 'equals', value: 'West' }],
        },
      ]); // saved query lookup
      dbMock.queueResult([{ group: 'West', value: '500' }]); // aggregate select
      const { service } = makeService(dbMock);

      const result = await service.getChartData(tenant, 'c1');

      expect(result).toEqual({
        chart,
        rows: [{ group: 'West', value: 500 }],
      });
    });

    it('rejects saved chart data when a non-count aggregate uses a non-number metric field', async () => {
      const dbMock = createDbMock();
      const chart = {
        id: 'c1',
        tableId: 'table-1',
        savedQueryId: null,
        search: null,
        where: [],
        groupByField: 'region',
        metricField: 'region',
        aggFunction: 'sum',
        groupLimit: 10,
      };
      dbMock.queueResult([chart]);
      dbMock.queueResult([salesTable]);
      const { service } = makeService(dbMock);

      await expect(service.getChartData(tenant, 'c1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
