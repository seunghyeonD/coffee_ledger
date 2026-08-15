'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { canDo, getRoleLabel } from '@/lib/roles';

const ROLE_KEYS = ['master', 'admin', 'assistant', 'user'];

// 계정 유저의 역할·이름·소속 관리 (멤버 관리 헤더의 역할 관리 모달에서 렌더링)
export default function RoleManagement({ showToast }) {
  const { t } = useTranslation(['settings', 'common']);
  const { userRole, user, getCompanyMembers, updateMemberRole, updateMemberName, removeMember } = useAuth();
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(null);

  useEffect(() => {
    if (!canDo(userRole, 'manageRoles')) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getCompanyMembers();
        if (!cancelled) setCompanyMembers(data);
      } catch (e) {
        if (!cancelled) showToast(t('roles.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!canDo(userRole, 'manageRoles')) return null;

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await updateMemberRole(targetUserId, newRole);
      setCompanyMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m));
      showToast(t('roles.roleChanged'));
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('roles.roleChangeFailed') }));
    }
  };

  const handleNameSave = async (targetUserId) => {
    if (!editingName) return;
    try {
      await updateMemberName(targetUserId, editingName.name);
      setCompanyMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, name: editingName.name } : m));
      setEditingName(null);
      showToast(t('roles.nameChanged'));
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('roles.nameChangeFailed') }));
    }
  };

  const handleRemoveMember = async (targetUserId, email) => {
    if (!confirm(t('roles.confirmRemoveUser', { email }))) return;
    try {
      await removeMember(targetUserId);
      setCompanyMembers(prev => prev.filter(m => m.userId !== targetUserId));
      showToast(t('roles.userRemoved'));
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('roles.userRemoveFailed') }));
    }
  };

  return (
    <div className="role-embedded">
      <p className="settings-desc">{t('roles.description')}</p>
      {loading ? (
        <div className="empty-state">{t('roles.loading')}</div>
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
                        placeholder={t('roles.namePlaceholder')}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleNameSave(m.userId)}
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => handleNameSave(m.userId)}>
                        {t('common:save')}
                      </button>
                      <button className="btn btn-sm" onClick={() => setEditingName(null)}>
                        {t('common:cancel')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="role-member-name-row">
                        <span className="role-member-name">{m.name || t('roles.noName')}</span>
                        <button
                          className="role-edit-name-btn"
                          onClick={() => setEditingName({ userId: m.userId, name: m.name || '' })}
                        >
                          {t('common:edit')}
                        </button>
                      </div>
                      <span className="role-member-email">{m.email}</span>
                      {isMe && <span className="role-member-me">{t('roles.me')}</span>}
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
                    {ROLE_KEYS.map(key => (
                      <option key={key} value={key}>{getRoleLabel(key)}</option>
                    ))}
                  </select>
                  {!isMe && canDo(userRole, 'removeUser') && (
                    <button
                      className="role-remove-btn"
                      onClick={() => handleRemoveMember(m.userId, m.email)}
                      title={t('roles.removeFromCompany')}
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
  );
}
