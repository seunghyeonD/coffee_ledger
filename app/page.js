'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import LoginPage from '@/components/LoginPage';
import ResetPasswordPage from '@/components/ResetPasswordPage';
import CompanySelectPage from '@/components/CompanySelectPage';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Members from '@/components/Members';
import Shops from '@/components/Shops';
import History from '@/components/History';
import Summary from '@/components/Summary';
import SettingsPage from '@/components/SettingsPanel';
import FCMInitializer from '@/components/FCMInitializer';
import Toast from '@/components/Toast';

export default function Home() {
  const { t } = useTranslation('common');
  const { user, company, passwordRecovery, loading: authLoading } = useAuth();
  const { loaded, init, reset } = useStore();
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [error, setError] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    if (company) {
      setError(null);
      init(company.id).catch(e => setError(e.message || t('supabaseError')));
    } else {
      reset();
    }
  }, [company, init, reset]);

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="coffee-loader">
          <div className="coffee-cup">
            <div className="coffee-liquid"></div>
            <div className="coffee-steam">
              <span></span><span></span><span></span>
            </div>
          </div>
          <p>{t('preparingCoffee')}</p>
        </div>
      </div>
    );
  }

  if (passwordRecovery) return <ResetPasswordPage />;
  if (!user) return <LoginPage />;
  if (!company) return <CompanySelectPage />;

  if (error) {
    return (
      <div className="app-layout">
        <div className="loading-screen">
          <div style={{ textAlign: 'center' }}>
            <h2>{t('loadFailed')}</h2>
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{t('checkSupabase')}</p>
            <p style={{ marginTop: 8, color: 'var(--danger)', fontSize: 13 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="auth-page">
        <div className="coffee-loader">
          <div className="coffee-cup">
            <div className="coffee-liquid"></div>
            <div className="coffee-steam">
              <span></span><span></span><span></span>
            </div>
          </div>
          <p>{t('loadingData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} showToast={showToast} />
      <main className="main-content">
        {page === 'dashboard' && <Dashboard showToast={showToast} />}
        {page === 'members' && <Members showToast={showToast} />}
        {page === 'shops' && <Shops showToast={showToast} />}
        {page === 'history' && <History showToast={showToast} />}
        {page === 'summary' && <Summary />}
        {page === 'settings' && <SettingsPage showToast={showToast} />}
      </main>
      <FCMInitializer showToast={showToast} />
      <Toast message={toast} />
    </div>
  );
}
