import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, LogOut } from 'lucide-react';
import { useTenant } from '@boilerplate/ui-common';
import { restorePlatformSessionBackup } from '../../api-client';

/**
 * Always-visible bar while a super admin is impersonating a tenant user:
 * shows who is being viewed, in which tenant, by whom — and the way out.
 * Exiting restores the platform session saved when impersonation started
 * (see AdminTenantsPage.handleImpersonate); if that backup is gone (new
 * tab, cleared sessionStorage) it falls back to a clean logout.
 */
export function ImpersonationBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, tenantSlug, role, impersonatedByEmail, refreshMe, logout } = useTenant();
  const [isExiting, setIsExiting] = useState(false);

  async function handleExit() {
    setIsExiting(true);
    try {
      if (restorePlatformSessionBackup()) {
        await refreshMe();
        navigate('/admin/tenants', { replace: true });
      } else {
        await logout();
        navigate('/super-admin/login', { replace: true });
      }
    } finally {
      setIsExiting(false);
    }
  }

  const viewedUser = user?.fullName || user?.email || '';

  return (
    <div className="impersonation-banner" role="status">
      <span className="impersonation-banner__icon" aria-hidden="true">
        <Eye size={14} />
      </span>
      <span className="impersonation-banner__label">{t('shell.impersonationMode')}</span>
      <span className="impersonation-banner__details">
        <span>{t('shell.impersonationViewing', { user: viewedUser, tenant: tenantSlug ?? '' })}</span>
        <span className="impersonation-banner__meta">
          {t('shell.impersonationRole', { role: role ?? 'viewer' })}
          {impersonatedByEmail && <> · {t('shell.impersonationBy', { admin: impersonatedByEmail })}</>}
        </span>
      </span>
      <button
        type="button"
        className="impersonation-banner__exit"
        onClick={() => void handleExit()}
        disabled={isExiting}
      >
        <LogOut size={12} />
        {isExiting ? t('shell.impersonationExiting') : t('shell.exitImpersonation')}
      </button>
    </div>
  );
}
