'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/roles';

export default function CompanySelectPage() {
  const { t } = useTranslation(['company', 'common']);
  const { userCompanies, selectCompany, createCompany, joinCompany, signOut } = useAuth();
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createCompany(name.trim());
    } catch (err) {
      setError(err.message || t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await joinCompany(inviteCode.trim());
    } catch (err) {
      setError(err.message || t('joinFailed'));
    } finally {
      setLoading(false);
    }
  };

  const resetMode = () => {
    setMode(null);
    setError('');
    setName('');
    setInviteCode('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card company-select-card">
        <div className="auth-logo">{'\u2615'} {t('common:appName')}</div>
        <h2 className="auth-title">{t('selectCompany')}</h2>
        <p className="auth-subtitle">{t('selectCompanyDesc')}</p>

        {userCompanies.length > 0 && (
          <div className="company-list">
            {userCompanies.map(c => (
              <button key={c.id} className="company-item" onClick={() => selectCompany(c)}>
                <div className="company-item-name">{c.name}</div>
                <div className="company-item-role">{ROLE_LABELS[c.role] || c.role}</div>
              </button>
            ))}
          </div>
        )}

        {mode === null && (
          <div className="company-actions">
            <button className="btn btn-primary auth-btn" onClick={() => setMode('join')}>
              {t('joinWithCode')}
            </button>
            <button className="btn auth-btn" onClick={() => setMode('create')}>
              {t('createNew')}
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="company-create-form">
            <div className="form-group">
              <label>{t('inviteCode')}</label>
              <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder={t('inviteCodePlaceholder')} required autoFocus style={{ textTransform: 'uppercase' }} />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={resetMode}>{t('common:cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('joining') : t('join')}
              </button>
            </div>
          </form>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="company-create-form">
            <div className="form-group">
              <label>{t('companyName')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('companyNamePlaceholder')} required autoFocus />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={resetMode}>{t('common:cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('creating') : t('create')}
              </button>
            </div>
          </form>
        )}

        <button className="auth-logout-btn" onClick={signOut}>
          {t('common:logout')}
        </button>
      </div>
    </div>
  );
}
