'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';

export default function ResetPasswordPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError(t('passwordMinLength')); return; }
    if (password !== confirmPw) { setError(t('passwordMismatch')); return; }

    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err.message || t('passwordChangeFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">{'\u2615'} {t('common:appName')}</div>
          <div className="auth-success">
            <h3>{t('passwordChanged')}</h3>
            <p>{t('passwordChangedDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">{'\u2615'} {t('common:appName')}</div>
        <h2 className="auth-title">{t('newPasswordTitle')}</h2>
        <p className="auth-subtitle">{t('newPasswordDesc')}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{t('newPassword')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('passwordPlaceholder')} required autoFocus />
          </div>
          <div className="form-group">
            <label>{t('passwordConfirm')}</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t('passwordConfirmPlaceholder')} required />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading ? t('changingPassword') : t('changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
