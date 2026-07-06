import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Copy, KeyRound, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button, useTenant } from '@boilerplate/ui-common';
import { apiDisableTwoFactor, apiEnableTwoFactor, apiSetupTwoFactor } from '../api-client';

type SetupState = { secret: string; otpauthUrl: string; qrCodeDataUrl: string } | null;

export function SecuritySettingsPage() {
  const { t } = useTranslation();
  const { user, refreshMe } = useTenant();
  const [setup, setSetup] = useState<SetupState>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleStartSetup() {
    setError(null);
    setSubmitting(true);
    try {
      setSetup(await apiSetupTwoFactor());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('securitySettings.setupStartFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmEnable(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiEnableTwoFactor(code.trim());
      setBackupCodes(result.backupCodes);
      setSetup(null);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('securitySettings.invalidCode'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDoneWithBackupCodes() {
    setBackupCodes(null);
    await refreshMe();
  }

  async function handleDisable(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiDisableTwoFactor(disablePassword);
      setDisablePassword('');
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('securitySettings.disableFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="security-page" aria-label={t('securitySettings.title')}>
      <header className="security-header">
        <div>
          <p className="security-eyebrow">{t('securitySettings.accountSecurityEyebrow')}</p>
          <h1><ShieldCheck size={28} /> {t('securitySettings.heading')}</h1>
          <span>{t('securitySettings.description')}</span>
        </div>
        <span className={user?.twoFactorEnabled ? 'security-status security-status--on' : 'security-status'}>
          {user?.twoFactorEnabled ? t('securitySettings.statusEnabled') : t('securitySettings.statusDisabled')}
        </span>
      </header>

      {error && <p className="security-error">{error}</p>}

      <div className="security-panel">
        {backupCodes ? (
          <BackupCodesView backupCodes={backupCodes} onDone={handleDoneWithBackupCodes} t={t} />
        ) : setup ? (
          <SetupView
            setup={setup}
            code={code}
            setCode={setCode}
            submitting={submitting}
            onConfirm={handleConfirmEnable}
            t={t}
          />
        ) : user?.twoFactorEnabled ? (
          <DisableTwoFactorView
            disablePassword={disablePassword}
            setDisablePassword={setDisablePassword}
            submitting={submitting}
            onDisable={handleDisable}
            t={t}
          />
        ) : (
          <EnableTwoFactorView submitting={submitting} onStartSetup={handleStartSetup} t={t} />
        )}
      </div>
    </section>
  );
}

function BackupCodesView({ backupCodes, onDone, t }: { backupCodes: string[]; onDone: () => void; t: TFunction }) {
  async function copyCodes() {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
  }

  return (
    <div className="security-flow">
      <div className="security-copy">
        <CheckCircle2 size={24} />
        <h2>{t('securitySettings.backupCodesTitle')}</h2>
        <p>{t('securitySettings.backupCodesDescription')}</p>
      </div>
      <pre className="security-code-list">{backupCodes.join('\n')}</pre>
      <div className="security-actions">
        <Button variant="ghost" onClick={() => void copyCodes()}><Copy size={16} /> {t('securitySettings.backupCodesCopyButton')}</Button>
        <Button variant="primary" onClick={onDone}>{t('securitySettings.backupCodesDoneButton')}</Button>
      </div>
    </div>
  );
}

function SetupView({
  setup,
  code,
  setCode,
  submitting,
  onConfirm,
  t,
}: {
  setup: NonNullable<SetupState>;
  code: string;
  setCode: (val: string) => void;
  submitting: boolean;
  onConfirm: (e: FormEvent) => void;
  t: TFunction;
}) {
  return (
    <form className="security-flow security-flow--setup" onSubmit={onConfirm}>
      <div className="security-copy">
        <Smartphone size={24} />
        <h2>{t('securitySettings.setupTitle')}</h2>
        <p>{t('securitySettings.setupDescription')}</p>
      </div>
      <div className="security-setup-grid">
        <img src={setup.qrCodeDataUrl} alt="2FA setup QR code" className="security-qr" />
        <div className="security-manual-code">
          <span>{t('securitySettings.setupManualKeyLabel')}</span>
          <code>{setup.secret}</code>
        </div>
      </div>
      <label className="security-field">
        {t('securitySettings.setupVerificationCodeLabel')}
        <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required autoFocus />
      </label>
      <div className="security-actions">
        <Button variant="primary" disabled={submitting}>{submitting ? t('securitySettings.setupEnabling') : t('securitySettings.setupEnableButton')}</Button>
      </div>
    </form>
  );
}

function DisableTwoFactorView({
  disablePassword,
  setDisablePassword,
  submitting,
  onDisable,
  t,
}: {
  disablePassword: string;
  setDisablePassword: (val: string) => void;
  submitting: boolean;
  onDisable: (e: FormEvent) => void;
  t: TFunction;
}) {
  return (
    <form className="security-flow" onSubmit={onDisable}>
      <div className="security-copy">
        <LockKeyhole size={24} />
        <h2>{t('securitySettings.disableTitle')}</h2>
        <p>{t('securitySettings.disableDescription')}</p>
      </div>
      <label className="security-field">
        {t('securitySettings.disablePasswordLabel')}
        <input
          type="password"
          value={disablePassword}
          onChange={(event) => setDisablePassword(event.target.value)}
          required
        />
      </label>
      <div className="security-actions">
        <Button variant="danger" disabled={submitting}>{submitting ? t('securitySettings.disableDisabling') : t('securitySettings.disableButton')}</Button>
      </div>
    </form>
  );
}

function EnableTwoFactorView({
  submitting,
  onStartSetup,
  t,
}: {
  submitting: boolean;
  onStartSetup: () => void;
  t: TFunction;
}) {
  return (
    <div className="security-flow">
      <div className="security-copy">
        <KeyRound size={24} />
        <h2>{t('securitySettings.enableTitle')}</h2>
        <p>{t('securitySettings.enableDescription')}</p>
      </div>
      <div className="security-steps">
        <span>{t('securitySettings.enableStep1')}</span>
        <span>{t('securitySettings.enableStep2')}</span>
        <span>{t('securitySettings.enableStep3')}</span>
      </div>
      <div className="security-actions">
        <Button variant="primary" disabled={submitting} onClick={onStartSetup}>
          {submitting ? t('securitySettings.enableStarting') : t('securitySettings.enableButton')}
        </Button>
      </div>
    </div>
  );
}
