import { MenuPreferencesService } from './menu-preferences.service';

function makeService(featureKeys: string[] = []) {
  const db = {
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const featureFlagsService = {
    getEnabledFeatureKeys: jest.fn().mockResolvedValue(new Set(featureKeys)),
  };
  const cache = {
    del: jest.fn().mockResolvedValue(undefined),
  };
  const service = new MenuPreferencesService(
    db as never,
    featureFlagsService as never,
    cache as never,
  );

  return { service, db, featureFlagsService, cache };
}

describe('MenuPreferencesService', () => {
  it('preserves nested submenu order and hidden flags for available tenant menu items', async () => {
    const { service } = makeService(['employees', 'departments', 'tasks']);

    const result = await service.updateTenantMenuOrder(
      'tenant-1',
      [
        {
          id: 'custom-people',
          label: 'People',
          children: [{ id: 'departments', hidden: true }, { id: 'employees' }],
        },
        { id: 'tasks', hidden: true },
      ],
      'user-1',
    );

    expect(result.itemOrder).toEqual([
      {
        id: 'custom-people',
        label: 'People',
        icon: undefined,
        hidden: undefined,
        children: [
          {
            id: 'departments',
            label: undefined,
            icon: undefined,
            hidden: true,
          },
          {
            id: 'employees',
            label: undefined,
            icon: undefined,
            hidden: undefined,
          },
        ],
      },
      {
        id: 'tasks',
        label: undefined,
        icon: undefined,
        hidden: true,
      },
    ]);
  });

  it('drops unavailable nested menu items before saving', async () => {
    const { service } = makeService(['employees']);

    const result = await service.updateTenantMenuOrder(
      'tenant-1',
      [
        {
          id: 'custom-people',
          label: 'People',
          children: [{ id: 'unknown-module' }, { id: 'employees' }],
        },
      ],
      'user-1',
    );

    expect(result.itemOrder).toEqual([
      {
        id: 'custom-people',
        label: 'People',
        icon: undefined,
        hidden: undefined,
        children: [
          {
            id: 'employees',
            label: undefined,
            icon: undefined,
            hidden: undefined,
          },
        ],
      },
    ]);
  });
});
