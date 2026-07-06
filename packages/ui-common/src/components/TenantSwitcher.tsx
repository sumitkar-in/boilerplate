import React from 'react';
import { useTenant } from '../hooks/tenant-context';

export interface TenantSwitcherProps {
  tenants: { id: string; name: string; slug: string }[];
  onSelectTenant: (slug: string) => void;
  style?: React.CSSProperties;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({
  tenants,
  onSelectTenant,
  style,
}) => {
  const { tenantSlug } = useTenant();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
        Tenant:
      </span>
      <select
        value={tenantSlug || ''}
        onChange={(e) => {
          if (e.target.value) {
            onSelectTenant(e.target.value);
          }
        }}
        style={{
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border, #cbd5e1)',
          backgroundColor: 'var(--surface, #ffffff)',
          color: 'var(--text, #0f172a)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
        aria-label="Select active tenant"
      >
        <option value="" disabled>
          Select Tenant...
        </option>
        {tenants.map((t) => (
          <option key={t.id} value={t.slug}>
            {t.name} ({t.slug})
          </option>
        ))}
      </select>
    </div>
  );
};
