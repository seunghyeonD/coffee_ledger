'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { canDo, ROLE_LABELS } from '@/lib/roles';
import NotificationSettings from './NotificationSettings';

export default function SettingsPage({ showToast }) {
  const { signOut, clearCompany, userRole, getCompanyMembers, updateMemberRole, user } = useAuth();
  const store = useStore();
  const [activeTab, setActiveTab] = useState('notifications');
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const tabs = [
    { key: 'notifications', label: '알림' },
    ...(canDo(userRole, 'manageRoles') ? [{ key: 'roles', label: '역할 관리' }] : []),
    { key: 'export', label: '보고서', mobileOnly: true },
    { key: 'account', label: '계정', mobileOnly: true },
  ];

  useEffect(() => {
    if (activeTab === 'roles' && canDo(userRole, 'manageRoles')) {
      loadMembers();
    }
  }, [activeTab]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await getCompanyMembers();
      setCompanyMembers(data);
    } catch (e) {
      showToast('멤버 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await updateMemberRole(targetUserId, newRole);
      setCompanyMembers(prev =>
        prev.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m)
      );
      showToast('역할이 변경되었습니다.');
    } catch (e) {
      showToast('오류: ' + (e.message || '역할 변경 실패'));
    }
  };

  const handleExport = () => {
    import('@/lib/exportExcel').then(mod => {
      mod.exportExcel(store, showToast);
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="settings-page">
      <div className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`settings-tab ${activeTab === tab.key ? 'active' : ''} ${tab.mobileOnly ? 'mobile-only-tab' : ''}`}
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

        {activeTab === 'roles' && canDo(userRole, 'manageRoles') && (
          <div className="settings-section">
            <p className="settings-desc">기업 멤버들의 역할을 관리합니다.</p>
            {loadingMembers ? (
              <div className="empty-state">불러오는 중...</div>
            ) : (
              <div className="role-management-list">
                {companyMembers.map(m => (
                  <div key={m.userId} className="role-management-item">
                    <div className="role-member-info">
                      <span className="role-member-email">{m.email}</span>
                      {m.userId === user?.id && <span className="role-member-me">(나)</span>}
                    </div>
                    <select
                      className="role-select"
                      value={m.role}
                      onChange={e => handleRoleChange(m.userId, e.target.value)}
                      disabled={m.userId === user?.id}
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
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
  );
}
