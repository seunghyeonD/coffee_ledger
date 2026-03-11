'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import NotificationSettings from './NotificationSettings';

const TABS = [
  { key: 'notifications', label: '알림' },
  { key: 'export', label: '보고서' },
  { key: 'account', label: '계정' },
];

export default function SettingsPanel({ open, onClose, showToast }) {
  const { signOut, clearCompany } = useAuth();
  const store = useStore();
  const [activeTab, setActiveTab] = useState('notifications');

  if (!open) return null;

  const handleExport = () => {
    import('@/lib/exportExcel').then(mod => {
      mod.exportExcel(store, showToast);
    });
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <h3>설정</h3>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {activeTab === 'notifications' && (
            <NotificationSettings showToast={showToast} embedded />
          )}

          {activeTab === 'export' && (
            <div className="settings-section">
              <p className="settings-desc">현재 데이터를 엑셀 파일로 다운로드합니다.</p>
              <button className="btn-settings-action" onClick={handleExport}>
                엑셀 내보내기
              </button>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="settings-section">
              <button className="btn-settings-action" onClick={clearCompany}>
                기업 전환
              </button>
              <button className="btn-settings-action danger" onClick={handleSignOut}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
