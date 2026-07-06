import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@boilerplate/ui-common';
import { apiAcceptInvite, setSession } from '../api-client';
import './auth.css';

export function AcceptInvitePage() {
  const { t } = useTranslation();
  const { refreshMe } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const tenantSlug = searchParams.get('tenant') ?? '';
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token || !tenantSlug) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>{t('acceptInvite.invalidLinkTitle')}</h1>
          <p className="hint-text">{t('acceptInvite.invalidLinkMessage')}</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiAcceptInvite(tenantSlug, token, password, fullName.trim() || undefined);
      setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken, tenantSlug });
      await refreshMe();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('acceptInvite.acceptFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={(e) => void handleSubmit(e)}>
        <h1>{t('acceptInvite.title')}</h1>
        <p className="hint-text">
          {t('acceptInvite.joiningTenant', { tenant: tenantSlug })}
        </p>
        {error && <p className="error-text">{error}</p>}
        <label>
          {t('acceptInvite.fullNameLabel')}
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          {t('acceptInvite.passwordLabel')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? t('acceptInvite.joining') : t('acceptInvite.submitButton')}
        </button>
      </form>
    </div>
  );
}
