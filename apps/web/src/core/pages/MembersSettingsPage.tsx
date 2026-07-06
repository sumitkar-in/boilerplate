import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { TENANT_ROLE_KEYS, type TenantRole } from '@boilerplate/contracts';
import {
  AdvancedDataTable,
  Button,
  Input,
  Modal,
  SearchableSelect,
  Select,
  type AdvancedTableColumn,
  useServerTable,
  useTenant,
} from '@boilerplate/ui-common';
import { useTranslation } from 'react-i18next';
import { ViewToolbar } from '../components/ViewToolbar';
import {
  apiCreateTenantUser,
  apiCreateInvite,
  apiListMembers,
  apiListTenantRoles,
  apiRemoveMember,
  apiUpdateMemberRoleKey,
  type MemberRow,
  type TenantRoleRow,
} from '../api-client';

const ROLES: readonly TenantRole[] = TENANT_ROLE_KEYS;
type AddMode = 'invite' | 'create';

export function MembersSettingsPage() {
  const { t } = useTranslation();
  const { tenantSlug } = useTenant();
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const table = useServerTable();
  const [statusFilter, setStatusFilter] = useState<'' | 'invited' | 'active'>('');
  const [roles, setRoles] = useState<TenantRoleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>('invite');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<TenantRole>('member');
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const result = await apiListMembers({ ...table.query, status: statusFilter || undefined });
      setMembers(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('membersSettings.loadFailed'));
    }
  }, [statusFilter, t, table.query]);

  function changeStatusFilter(value: '' | 'invited' | 'active') {
    setStatusFilter(value);
    table.setPage(0);
  }

  useEffect(() => {
    const timer = setTimeout(() => void loadMembers(), 250);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  useEffect(() => {
    let cancelled = false;
    apiListTenantRoles().then(
      (roleRows) => { if (!cancelled) setRoles(roleRows); },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('membersSettings.loadFailed'));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [t]);

  function openAddModal() {
    setMode('invite');
    setEmail('');
    setFullName('');
    setRole('member');
    setTemporaryPassword(null);
    setInviteLink(null);
    setIsAddModalOpen(true);
  }

  async function handleSubmitAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'invite') {
        const { inviteToken } = await apiCreateInvite(email.trim(), role);
        setInviteLink(`${window.location.origin}/accept-invite?token=${inviteToken}&tenant=${tenantSlug}`);
      } else {
        const created = await apiCreateTenantUser({
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          role,
        });
        setTemporaryPassword(created.temporaryPassword ?? null);
      }
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(mode === 'invite' ? 'membersSettings.inviteFailed' : 'membersSettings.addUserFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, roleKey: string) {
    setError(null);
    try {
      await apiUpdateMemberRoleKey(userId, roleKey);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('membersSettings.updateRoleFailed'));
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      await apiRemoveMember(userId);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('membersSettings.removeFailed'));
    }
  }

  const columns: AdvancedTableColumn<MemberRow>[] = [
    {
      key: 'email',
      title: t('membersSettings.columnEmail'),
      getValue: (member) => member.email,
      filterable: false,
    },
    {
      key: 'fullName',
      title: t('membersSettings.columnName'),
      getValue: (member) => member.fullName ?? '',
      render: (member) => member.fullName ?? '-',
      filterable: false,
    },
    {
      key: 'role',
      title: t('membersSettings.columnRole'),
      getValue: (member) => member.role,
      filterable: false,
      render: (member) => (
        <SearchableSelect
          value={member.roleKey}
          options={roles.map((roleRow) => ({
            value: roleRow.key,
            label: roleRow.name,
            description: roleRow.description ?? undefined,
          }))}
          onValueChange={(value) => void handleRoleChange(member.userId, value)}
        />
      ),
    },
    {
      key: 'status',
      title: t('membersSettings.columnStatus'),
      getValue: (member) => member.status,
      filterable: false,
      render: (member) => (
        <span className={`badge status-badge status-badge--${member.status}`}>
          {member.status}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      isAction: true,
      align: 'right',
      render: (member) => (
        <button type="button" className="button button--ghost" onClick={() => void handleRemove(member.userId)}>
          {t('membersSettings.remove')}
        </button>
      ),
    },
  ];

  return (
    <section className="boilerplate-view-container" aria-label={t('membersSettings.title')}>
      <ViewToolbar
        viewName={t('membersSettings.title')}
        count={total}
        primaryActionLabel={t('membersSettings.addUserTitle')}
        onPrimaryAction={openAddModal}
      />
      {error && <p className="error-text">{error}</p>}

      <div className="ui-page-body">
        <AdvancedDataTable<MemberRow>
          data={members ?? []}
          columns={columns}
          rowKey={(member) => member.userId}
          isLoading={members === null}
          searchPlaceholder={t('membersSettings.searchPlaceholder')}
          emptyMessage={t('membersSettings.emptyMessage')}
          exportFileName="members.csv"
          searchValue={table.search}
          onSearchChange={table.setSearch}
          sort={table.sort}
          onSortChange={table.onSortChange}
          pagination={{
            page: table.page,
            pageSize: table.pageSize,
            total,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
          }}
          toolbarActions={
            <select
              className="toolbar-select"
              value={statusFilter}
              aria-label={t('membersSettings.columnStatus')}
              onChange={(event) => changeStatusFilter(event.target.value as '' | 'invited' | 'active')}
            >
              <option value="">{t('membersSettings.allStatuses')}</option>
              <option value="invited">{t('membersSettings.statusInvited')}</option>
              <option value="active">{t('membersSettings.statusActive')}</option>
            </select>
          }
        />
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('membersSettings.addUserTitle')}>
        <div className="tenant-add-member-form__mode" role="tablist" aria-label="Add member method">
          <button type="button" role="tab" aria-selected={mode === 'invite'} onClick={() => setMode('invite')}>
            {t('membersSettings.inviteTitle')}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'create'} onClick={() => setMode('create')}>
            {t('membersSettings.addUserTitle')}
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmitAdd(e)}>
          <Input
            label={t('membersSettings.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode === 'create' && (
            <Input
              label={t('membersSettings.nameLabel')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <Select
            label={t('membersSettings.roleLabel')}
            value={role}
            onChange={(e) => setRole(e.target.value as TenantRole)}
            options={ROLES.map((r) => ({ label: r, value: r }))}
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? (mode === 'invite' ? t('membersSettings.inviting') : t('membersSettings.adding'))
              : (mode === 'invite' ? t('membersSettings.sendInviteButton') : t('membersSettings.addButton'))}
          </Button>
          {temporaryPassword && (
            <p className="hint-text invite-link">
              {t('membersSettings.temporaryPasswordNote')}
              <br />
              <code>{temporaryPassword}</code>
            </p>
          )}
          {inviteLink && (
            <p className="hint-text invite-link">
              {t('membersSettings.noMailConfiguredNote')}
              <br />
              <code>{inviteLink}</code>
            </p>
          )}
        </form>
      </Modal>
    </section>
  );
}
