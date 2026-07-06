import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@boilerplate/ui-common';
import { apiGetTenantBranding } from '../api-client';
import type { TenantBranding } from '../api-client';
import { ThemeToggle } from '../components/ThemeToggle';
import './auth.css';

type LoginMode = 'tenant' | 'super-admin';

export function LoginPage({ mode = 'tenant' }: { mode?: LoginMode }) {
  const { t } = useTranslation();
  const { login, loginSuperAdmin } = useTenant();
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  useEffect(() => {
    if (mode !== 'tenant') return;
    const slug = tenantSlug.trim();
    if (!slug) {
      const timer = setTimeout(() => setBranding(null), 0);
      return () => clearTimeout(timer);
    }
    if (mode !== 'tenant') {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void apiGetTenantBranding(slug).then((result) => {
        if (!cancelled) setBranding(result);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, tenantSlug]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result =
        mode === 'super-admin'
          ? await loginSuperAdmin(email.trim(), password)
          : await login(tenantSlug.trim(), email.trim(), password);
      if (result.twoFactorRequired) {
        navigate('/login/2fa', {
          state: {
            partialToken: result.partialToken,
            returnTo: mode === 'super-admin' ? '/admin/tenants' : '/',
            fallbackLoginPath:
              mode === 'super-admin' ? '/super-admin/login' : '/login',
          },
        });
      } else {
        navigate(mode === 'super-admin' ? '/admin/tenants' : '/', {
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__tools">
        <ThemeToggle />
      </div>
      <form className="auth-card" onSubmit={(e) => void handleSubmit(e)}>
        {mode === 'tenant' && branding?.logoUrl && (
          <div className="auth-card__logo">
            <img src={branding.logoUrl} alt={branding.companyName ?? 'Company logo'} />
          </div>
        )}
        <h1>{mode === 'super-admin' ? t('login.superAdminTitle') : t('login.title')}</h1>
        {mode === 'tenant' && branding?.companyName && (
          <p className="auth-card__subtitle">{branding.companyName}</p>
        )}
        {error && <p className="error-text">{error}</p>}
        {mode === 'tenant' && (
          <label>
            {t('login.tenantSlugLabel')}
            <input
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              autoComplete="organization"
              required
              autoFocus
            />
          </label>
        )}
        <label>
          {t('login.emailLabel')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus={mode === 'super-admin'}
          />
        </label>
        <label>
          {t('login.passwordLabel')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="button" disabled={submitting}>
          {submitting
            ? t('login.signingIn')
            : mode === 'super-admin'
              ? t('login.signInSuperAdmin')
              : t('login.signIn')}
        </button>
      </form>
    </div>
  );
}
