'use client';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function Sidebar({ page, setPage, showToast }) {
  const { t } = useTranslation(['sidebar', 'common', 'company']);
  const { company, signOut, clearCompany } = useAuth();
  const store = useStore();

  const NAV_ITEMS = [
    { key: 'dashboard', icon: '\u{1F4C5}', label: t('sidebar:dashboard'), mobileLabel: t('sidebar:dashboardShort') },
    { key: 'members', icon: '\u{1F465}', label: t('sidebar:members'), mobileLabel: t('sidebar:membersShort') },
    { key: 'shops', icon: '\u2615', label: t('sidebar:shops'), mobileLabel: t('sidebar:shopsShort') },
    { key: 'history', icon: '\u{1F4CB}', label: t('sidebar:history'), mobileLabel: t('sidebar:historyShort') },
    { key: 'summary', icon: '\u{1F4CA}', label: t('sidebar:summary'), mobileLabel: t('sidebar:summaryShort') },
    { key: 'settings', icon: '\u2699\uFE0F', label: t('sidebar:settings'), mobileLabel: t('sidebar:settings') },
  ];

  const handleExport = () => {
    import('@/lib/exportExcel').then(mod => {
      mod.exportExcel(store, showToast);
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span>{'\u2615'}</span>
        <span className="logo-text">{t('common:appName')}</span>
      </div>

      {company && (
        <div className="sidebar-company">
          <span className="company-name">{company.name} <span className="company-code">- {company.invite_code}</span></span>
          <button className="btn-switch-company" onClick={clearCompany} title={t('company:switchCompany')}>
            {'\u{1F504}'}
          </button>
        </div>
      )}

      <ul className="nav-menu">
        {NAV_ITEMS.map(item => (
          <li key={item.key}>
            <button
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-label-mobile">{item.mobileLabel}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <button className="btn-export" onClick={handleExport}>
          {'\u{1F4E5}'} {t('sidebar:exportExcel')}
        </button>
        <button className="btn-logout" onClick={handleSignOut}>
          {'\u{1F6AA}'} {t('common:logout')}
        </button>
      </div>
    </nav>
  );
}
