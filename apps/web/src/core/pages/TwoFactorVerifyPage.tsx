import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@boilerplate/ui-common';
import { ThemeToggle } from '../components/ThemeToggle';
import './auth.css';

type LocationState = {
  fallbackLoginPath?: string;
  partialToken?: string;
  returnTo?: string;
};

export function TwoFactorVerifyPage() {
  const { t } = useTranslation();
  const { verifyTwoFactor } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const partialToken = state?.partialToken;
  const fallbackLoginPath = state?.fallbackLoginPath ?? '/login';
  const returnTo = state?.returnTo ?? '/';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!partialToken) {
    return <Navigate to={fallbackLoginPath} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyTwoFactor(partialToken as string, code.trim());
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('twoFactorVerify.invalidCode'));
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
        <h1>{t('twoFactorVerify.title')}</h1>
        <p className="hint-text">
          {t('twoFactorVerify.description')}
        </p>
        {error && <p className="error-text">{error}</p>}
        <label>
          {t('twoFactorVerify.codeLabel')}
          <input value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
        </label>
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? t('twoFactorVerify.verifying') : t('twoFactorVerify.verifyButton')}
        </button>
      </form>
    </div>
  );
}
