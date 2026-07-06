import { mergeTenantSettings, TenantsService } from './tenants.service';

function createDbMock() {
  const limitMock = jest.fn().mockResolvedValue([]);
  const whereForSelectMock = jest.fn(() => ({ limit: limitMock }));
  const fromMock = jest.fn(() => ({ where: whereForSelectMock }));
  const selectMock = jest.fn(() => ({ from: fromMock }));

  const returningMock = jest
    .fn()
    .mockResolvedValue([{ id: 't1', slug: 'acme' }]);
  const valuesMock = jest.fn(() => ({ returning: returningMock }));
  const insertMock = jest.fn(() => ({ values: valuesMock }));

  const updateReturningMock = jest.fn().mockResolvedValue([]);
  const updateWhereMock = jest
    .fn()
    .mockReturnValue({ returning: updateReturningMock });
  const setMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: setMock }));

  const db = { select: selectMock, insert: insertMock, update: updateMock };
  return {
    db,
    limitMock,
    insertMock,
    valuesMock,
    returningMock,
    updateMock,
    setMock,
    updateWhereMock,
    updateReturningMock,
  };
}

describe('TenantsService', () => {
  it('mergeTenantSettings() preserves overrides for every tenant settings section', () => {
    const merged = mergeTenantSettings({
      general: {
        timezone: 'Asia/Kolkata',
        locale: 'hi',
        dateFormat: 'dd/MM/yyyy',
        currency: 'INR',
        weekStartsOn: 'sunday',
      },
      dashboard: {
        title: 'Ops view',
        subtitle: 'Tenant operating center',
        defaultRange: '90d',
        widgets: ['activity'],
        quickLinkLimit: 3,
      },
      navigation: {
        defaultCollapsed: true,
        moduleGrouping: 'flat',
        showSearch: false,
      },
      notifications: {
        fromEmail: 'alerts@example.com',
        digestFrequency: 'daily',
        enableInApp: false,
        enableEmail: true,
      },
      security: {
        requireTwoFactor: true,
        sessionTimeoutMinutes: 30,
        allowedDomains: ['example.com'],
      },
      integrations: {
        webhookUrl: 'https://hooks.example.com/tenant',
        supportEmail: 'support@example.com',
      },
      data: {
        retentionDays: 30,
        exportFormat: 'xlsx',
      },
    });

    expect(merged.general).toEqual({
      timezone: 'Asia/Kolkata',
      locale: 'hi',
      dateFormat: 'dd/MM/yyyy',
      currency: 'INR',
      weekStartsOn: 'sunday',
    });
    expect(merged.dashboard).toEqual({
      title: 'Ops view',
      subtitle: 'Tenant operating center',
      defaultRange: '90d',
      widgets: ['activity'],
      quickLinkLimit: 3,
    });
    expect(merged.navigation).toEqual({
      defaultCollapsed: true,
      moduleGrouping: 'flat',
      showSearch: false,
    });
    expect(merged.notifications).toEqual({
      fromEmail: 'alerts@example.com',
      digestFrequency: 'daily',
      enableInApp: false,
      enableEmail: true,
    });
    expect(merged.security).toEqual({
      requireTwoFactor: true,
      sessionTimeoutMinutes: 30,
      allowedDomains: ['example.com'],
    });
    expect(merged.integrations).toEqual({
      webhookUrl: 'https://hooks.example.com/tenant',
      supportEmail: 'support@example.com',
      aiModel: 'qwen3:0.6b',
    });
    expect(merged.data).toEqual({
      retentionDays: 30,
      exportFormat: 'xlsx',
    });
  });

  it('findBySlug() returns the first matching row', async () => {
    const { db, limitMock } = createDbMock();
    limitMock.mockResolvedValue([{ id: 't1', slug: 'acme' }]);
    const service = new TenantsService(db as never);

    expect(await service.findBySlug('acme')).toEqual({
      id: 't1',
      slug: 'acme',
    });
  });

  it('findBySlug() returns undefined for no match', async () => {
    const { db } = createDbMock();
    const service = new TenantsService(db as never);

    expect(await service.findBySlug('ghost')).toBeUndefined();
  });

  it('findById() returns the matching row', async () => {
    const { db, limitMock } = createDbMock();
    limitMock.mockResolvedValue([{ id: 't1', slug: 'acme' }]);
    const service = new TenantsService(db as never);

    expect(await service.findById('t1')).toEqual({ id: 't1', slug: 'acme' });
  });

  it('create() inserts a tenant with the given slug/schemaName', async () => {
    const { db, valuesMock, returningMock } = createDbMock();
    returningMock.mockResolvedValue([
      { id: 't1', slug: 'acme', schemaName: 'tenant_acme' },
    ]);
    const service = new TenantsService(db as never);

    const result = await service.create({
      slug: 'acme',
      schemaName: 'tenant_acme',
    });

    expect(valuesMock).toHaveBeenCalledWith({
      slug: 'acme',
      schemaName: 'tenant_acme',
    });
    expect(result).toEqual({
      id: 't1',
      slug: 'acme',
      schemaName: 'tenant_acme',
    });
  });

  it('updateStatus() sets the tenant status', async () => {
    const { db, setMock } = createDbMock();
    const service = new TenantsService(db as never);

    await service.updateStatus('t1', 'suspended');

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'suspended' }),
    );
  });

  describe('getSettings()', () => {
    it('merges stored settings over the documented defaults', async () => {
      const { db, limitMock } = createDbMock();
      limitMock.mockResolvedValue([
        {
          tenantId: 't1',
          tenantSlug: 'acme',
          companyName: 'Acme',
          brandColor: '#111111',
          logoUrl: null,
          settings: { security: { requireTwoFactor: true } },
        },
      ]);
      const service = new TenantsService(db as never);

      const result = await service.getSettings('t1');

      expect(result?.settings.security.requireTwoFactor).toBe(true);
      // Untouched sections still fall back to documented defaults.
      expect(result?.settings.general.locale).toBe('en');
    });

    it('returns undefined for a tenant with no settings row', async () => {
      const { db } = createDbMock();
      const service = new TenantsService(db as never);

      expect(await service.getSettings('missing')).toBeUndefined();
    });
  });
});
