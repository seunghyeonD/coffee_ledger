'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { canDo, ROLE_LABELS } from '@/lib/roles';
import NotificationSettings from './NotificationSettings';

export default function SettingsPage({ showToast }) {
  const { signOut, clearCompany, userRole, getCompanyMembers, updateMemberRole, updateMemberName, removeMember, user, company } = useAuth();
  const store = useStore();
  const [activeTab, setActiveTab] = useState('notifications');
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [editingName, setEditingName] = useState(null); // { userId, name }
  const [notiTitle, setNotiTitle] = useState('');
  const [notiBody, setNotiBody] = useState('');
  const [sendingNoti, setSendingNoti] = useState(false);

  const tabs = [
    { key: 'notifications', label: '알림' },
    ...(canDo(userRole, 'manageRoles') ? [{ key: 'roles', label: '역할 관리' }] : []),
    ...(canDo(userRole, 'sendNotification') ? [{ key: 'send-noti', label: '알림 발송' }] : []),
    { key: 'company-info', label: '기업 정보', mobileOnly: true },
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

  const handleNameSave = async (targetUserId) => {
    if (!editingName) return;
    try {
      await updateMemberName(targetUserId, editingName.name);
      setCompanyMembers(prev =>
        prev.map(m => m.userId === targetUserId ? { ...m, name: editingName.name } : m)
      );
      setEditingName(null);
      showToast('이름이 변경되었습니다.');
    } catch (e) {
      showToast('오류: ' + (e.message || '이름 변경 실패'));
    }
  };

  const handleRemoveMember = async (targetUserId, email) => {
    if (!confirm(`'${email}'을(를) 이 기업에서 제거하시겠습니까?\n해당 유저의 알림 설정도 함께 삭제됩니다.`)) return;
    try {
      await removeMember(targetUserId);
      setCompanyMembers(prev => prev.filter(m => m.userId !== targetUserId));
      showToast('유저가 제거되었습니다.');
    } catch (e) {
      showToast('오류: ' + (e.message || '유저 제거 실패'));
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notiTitle.trim() || !notiBody.trim()) return;
    setSendingNoti(true);
    try {
      console.log('Sending manual noti - companyId:', company?.id);
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual',
          companyId: company?.id,
          data: { title: notiTitle.trim(), body: notiBody.trim() },
        }),
      });
      const result = await res.json();
      console.log('Manual noti result:', JSON.stringify(result));
      showToast(`알림이 ${result.sent || 0}명에게 발송되었습니다.`);
      setNotiTitle('');
      setNotiBody('');
    } catch (e) {
      showToast('알림 발송에 실패했습니다.');
    } finally {
      setSendingNoti(false);
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
            <p className="settings-desc">기업 멤버들의 역할과 이름을 관리합니다.</p>
            {loadingMembers ? (
              <div className="empty-state">불러오는 중...</div>
            ) : (
              <div className="role-management-list">
                {companyMembers.map(m => {
                  const isMe = m.userId === user?.id;
                  const isEditing = editingName?.userId === m.userId;
                  return (
                    <div key={m.userId} className="role-management-item">
                      <div className="role-member-info">
                        {isEditing ? (
                          <div className="role-name-edit">
                            <input
                              type="text"
                              className="role-name-input"
                              value={editingName.name}
                              onChange={e => setEditingName({ ...editingName, name: e.target.value })}
                              placeholder="이름 입력"
                              autoFocus
                              onKeyDown={e => e.key === 'Enter' && handleNameSave(m.userId)}
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => handleNameSave(m.userId)}>저장</button>
                            <button className="btn btn-sm" onClick={() => setEditingName(null)}>취소</button>
                          </div>
                        ) : (
                          <>
                            <div className="role-member-name-row">
                              <span className="role-member-name">{m.name || '(이름 없음)'}</span>
                              <button className="role-edit-name-btn" onClick={() => setEditingName({ userId: m.userId, name: m.name || '' })}>
                                수정
                              </button>
                            </div>
                            <span className="role-member-email">{m.email}</span>
                            {isMe && <span className="role-member-me">(나)</span>}
                          </>
                        )}
                      </div>
                      <div className="role-member-actions">
                        <select
                          className="role-select"
                          value={m.role}
                          onChange={e => handleRoleChange(m.userId, e.target.value)}
                          disabled={isMe}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {!isMe && canDo(userRole, 'removeUser') && (
                          <button
                            className="role-remove-btn"
                            onClick={() => handleRemoveMember(m.userId, m.email)}
                            title="기업에서 제거"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'send-noti' && canDo(userRole, 'sendNotification') && (
          <div className="settings-section">
            <p className="settings-desc">기업의 모든 멤버에게 수동으로 알림을 발송합니다.</p>
            <form onSubmit={handleSendNotification} className="manual-noti-form">
              <div className="form-group">
                <label>알림 제목</label>
                <input
                  type="text"
                  value={notiTitle}
                  onChange={e => setNotiTitle(e.target.value)}
                  placeholder="예: 이번 달 충전 안내"
                  required
                />
              </div>
              <div className="form-group">
                <label>알림 내용</label>
                <textarea
                  value={notiBody}
                  onChange={e => setNotiBody(e.target.value)}
                  placeholder="예: 3월 커피비를 충전해주세요."
                  rows={3}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={sendingNoti} style={{ width: '100%' }}>
                {sendingNoti ? '발송중...' : '알림 발송'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'company-info' && (
          <div className="settings-section">
            <div className="company-info-card">
              <div className="company-info-row">
                <span className="company-info-label">기업 이름</span>
                <span className="company-info-value">{company?.name}</span>
              </div>
              <div className="company-info-row">
                <span className="company-info-label">초대 코드</span>
                <span className="company-info-value company-info-code">{company?.invite_code}</span>
              </div>
            </div>
            <p className="settings-desc">초대 코드를 공유하면 다른 멤버가 기업에 참여할 수 있습니다.</p>
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
