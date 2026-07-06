import { MembershipsService } from './memberships.service';

function createDbMock() {
  const limitMock = jest.fn().mockResolvedValue([]);
  const whereForSelectMock = jest.fn(() => ({ limit: limitMock }));
  const innerJoinMock = jest.fn(() => ({
    where: jest.fn().mockResolvedValue([]),
  }));
  const fromMock = jest.fn(() => ({
    where: whereForSelectMock,
    innerJoin: innerJoinMock,
  }));
  const selectMock = jest.fn(() => ({ from: fromMock }));

  const returningMock = jest
    .fn()
    .mockResolvedValue([{ id: 'm1', role: 'member', status: 'invited' }]);
  const onConflictDoUpdateMock = jest.fn(() => ({ returning: returningMock }));
  const valuesMock = jest.fn(() => ({
    onConflictDoUpdate: onConflictDoUpdateMock,
  }));
  const insertMock = jest.fn(() => ({ values: valuesMock }));

  const updateWhereMock = jest.fn().mockResolvedValue(undefined);
  const setMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: setMock }));

  const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
  const deleteMock = jest.fn(() => ({ where: deleteWhereMock }));

  const db = {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  };
  return {
    db,
    limitMock,
    whereForSelectMock,
    innerJoinMock,
    insertMock,
    valuesMock,
    onConflictDoUpdateMock,
    returningMock,
    updateMock,
    setMock,
    updateWhereMock,
    deleteMock,
    deleteWhereMock,
  };
}

describe('MembershipsService', () => {
  it('getMembership() returns the membership row for a tenant/user pair', async () => {
    const { db, limitMock } = createDbMock();
    limitMock.mockResolvedValue([{ role: 'admin', status: 'active' }]);
    const service = new MembershipsService(db as never);

    expect(await service.getMembership('t1', 'u1')).toEqual({
      role: 'admin',
      status: 'active',
    });
  });

  it('createMembership() defaults status to "invited" unless given', async () => {
    const { db, valuesMock } = createDbMock();
    const service = new MembershipsService(db as never);

    await service.createMembership({
      tenantId: 't1',
      userId: 'u1',
      role: 'member',
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        userId: 'u1',
        role: 'member',
        status: 'invited',
      }),
    );
  });

  it('createMembership() upserts on (tenantId, userId) conflict', async () => {
    const { db, onConflictDoUpdateMock } = createDbMock();
    const service = new MembershipsService(db as never);

    await service.createMembership({
      tenantId: 't1',
      userId: 'u1',
      role: 'admin',
      status: 'active',
    });

    expect(onConflictDoUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ role: 'admin', status: 'active' }),
      }),
    );
  });

  it('updateMemberRole() updates the role for the given tenant/user', async () => {
    const { db, setMock, updateWhereMock } = createDbMock();
    const service = new MembershipsService(db as never);

    await service.updateMemberRole('t1', 'u1', 'viewer');

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'viewer' }),
    );
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('activateMembership() sets status to active', async () => {
    const { db, setMock } = createDbMock();
    const service = new MembershipsService(db as never);

    await service.activateMembership('t1', 'u1');

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('removeMember() deletes the membership row', async () => {
    const { db, deleteMock, deleteWhereMock } = createDbMock();
    const service = new MembershipsService(db as never);

    await service.removeMember('t1', 'u1');

    expect(deleteMock).toHaveBeenCalled();
    expect(deleteWhereMock).toHaveBeenCalled();
  });
});
