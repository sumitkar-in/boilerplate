import { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, Plus, Users } from 'lucide-react';
import { Button, Input, Select } from '@boilerplate/ui-common';
import type { MemberRow } from '../../api-client';

const ROLE_OPTIONS = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
  { label: 'Viewer', value: 'viewer' },
];

type AddMode = 'create' | 'invite';

export function TenantMembersPanel({
  members,
  tenantActive,
  onImpersonate,
  onAddUser,
  onInviteUser,
}: {
  members: MemberRow[] | null;
  tenantActive: boolean;
  onImpersonate: (member: MemberRow) => void;
  onAddUser: (email: string, fullName: string, role: string) => void;
  onInviteUser: (email: string, role: string) => void;
}) {
  const [mode, setMode] = useState<AddMode>('invite');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('member');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email) return;
    if (mode === 'invite') onInviteUser(email, role);
    else onAddUser(email, fullName, role);
    setEmail('');
    setFullName('');
    setRole('member');
  }

  return (
    <section className="card admin-panel">
      <div className="panel-heading">
        <h2 className="section-title">
          <Users size={18} />
          Users
        </h2>
      </div>
      <div className="members-list">
        {members?.map((member) => (
          <div key={member.userId} className="members-list__row">
            <div>
              <strong>{member.email}</strong>
              <p className="hint-text">
                {member.fullName || 'No name'} · {member.role} · {member.status}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!tenantActive || member.status !== 'active'}
              onClick={() => onImpersonate(member)}
            >
              <Eye size={16} />
              Open
            </Button>
          </div>
        ))}
        {members?.length === 0 && <p className="hint-text">No users in this tenant.</p>}
      </div>

      <form className="tenant-add-member-form" onSubmit={handleSubmit}>
        <div className="tenant-add-member-form__mode" role="tablist" aria-label="Add member method">
          <button type="button" role="tab" aria-selected={mode === 'invite'} onClick={() => setMode('invite')}>
            Invite by email
          </button>
          <button type="button" role="tab" aria-selected={mode === 'create'} onClick={() => setMode('create')}>
            Create directly
          </button>
        </div>
        <div className="tenant-add-member-form__fields">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {mode === 'create' && (
            <Input
              placeholder="Name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          )}
          <Select value={role} onChange={(event) => setRole(event.target.value)} options={ROLE_OPTIONS} />
          <Button type="submit" variant="primary" disabled={!email}>
            <Plus size={16} />
            {mode === 'invite' ? 'Invite' : 'Add'}
          </Button>
        </div>
      </form>
    </section>
  );
}
