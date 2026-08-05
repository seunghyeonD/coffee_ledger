'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { authFetch } from '@/lib/api-fetch';
import { formatMoney } from '@/lib/utils';
import { canDo } from '@/lib/roles';
import Modal from '@/components/Modal';

export default function Members({ showToast }) {
  const { t } = useTranslation(['members', 'common']);
  const { members, getMemberBalance, getDepositsByMember, addMember, updateMember, deleteMember, addDeposit, deleteDeposit, companyId } = useStore();
  const { userRole } = useAuth();
  const [sendingNoti, setSendingNoti] = useState(null);
  const [memberModal, setMemberModal] = useState(null);
  const [depositModal, setDepositModal] = useState(null);
  const [emailModal, setEmailModal] = useState(null);

  const handleSaveMember = async (e) => {
    e.preventDefault();
    try {
      if (memberModal.id) {
        await updateMember(memberModal.id, memberModal.name, memberModal.email);
        showToast(t('memberEdited'));
      } else {
        await addMember(memberModal.name, memberModal.balance || 0, memberModal.email);
        showToast(t('memberAdded'));

        // 계정 없는 이메일이면 초대 메일 발송
        if (memberModal.email?.trim()) {
          const inviteName = memberModal.name;
          authFetch('/api/members/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              memberName: inviteName,
              email: memberModal.email.trim(),
            }),
          }).then(async res => {
            const result = await res.json();
            if (result.invited) showToast(t('inviteSent', { name: inviteName }));
          }).catch(() => {});
        }
      }
      setMemberModal(null);
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('common:saveFailed') }));
    }
  };

  const handleDeleteMember = async (m) => {
    if (confirm(t('confirmDeleteMember', { name: m.name }))) {
      try {
        await deleteMember(m.id);
        showToast(t('memberDeleted'));
      } catch (e) {
        showToast(t('common:error', { message: e.message || t('common:deleteFailed') }));
      }
    }
  };

  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    try {
      await addDeposit(depositModal.memberId, depositModal.month, depositModal.amount);
      setDepositModal(null);
      showToast(t('depositComplete'));
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('depositFailed') }));
    }
  };

  const handleDeleteDeposit = async (id) => {
    if (confirm(t('confirmDeleteDeposit'))) {
      try {
        await deleteDeposit(id);
        showToast(t('depositDeleted'));
      } catch (e) {
        showToast(t('common:error', { message: e.message || t('common:deleteFailed') }));
      }
    }
  };

  const handleSendChargeNotification = async (member, balance, channel) => {
    setSendingNoti(`${member.id}-${channel}`);
    try {
      const res = await authFetch('/api/notifications/send-to-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          memberId: member.id,
          memberName: member.name,
          balance,
          channel,
        }),
      });
      const result = await res.json();
      if (result.sent > 0 || result.emailed > 0) {
        showToast(channel === 'email' ? t('emailSent', { name: member.name }) : t('notificationSent', { name: member.name }));
      } else if (result.matched === 0) {
        showToast(t('userNotFound', { name: member.name }));
      } else {
        showToast(t('userNoNotification'));
      }
    } catch (e) {
      showToast(t('notificationFailed'));
    } finally {
      setSendingNoti(null);
    }
  };

  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    const { member, balance, title, body } = emailModal;
    setSendingNoti(`${member.id}-email`);
    try {
      const res = await authFetch('/api/notifications/send-to-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          memberId: member.id,
          memberName: member.name,
          balance,
          channel: 'email',
          title,
          body,
        }),
      });
      const result = await res.json();
      if (result.emailed > 0) {
        showToast(t('emailSent', { name: member.name }));
      } else if (result.matched === 0) {
        showToast(t('userNotFound', { name: member.name }));
      } else {
        showToast(t('userNoNotification'));
      }
      setEmailModal(null);
    } catch (e) {
      showToast(t('notificationFailed'));
    } finally {
      setSendingNoti(null);
    }
  };

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <>
      <div className="page-header">
        <h1>{t('title')}</h1>
        {canDo(userRole, 'addMember') && (
          <button className="btn btn-primary" onClick={() => setMemberModal({ name: '', email: '', balance: 0 })}>
            {t('addMember')}
          </button>
        )}
      </div>

      <div className="members-grid">
        {members.map(m => {
          const bal = getMemberBalance(m.id);
          const deps = getDepositsByMember(m.id);
          return (
            <div key={m.id} className="member-card">
              <div className="member-card-header">
                <div className="member-name">{m.name}</div>
                {canDo(userRole, 'updateMember') && (
                  <div className="member-actions">
                    <button className="btn btn-sm" onClick={() => setMemberModal({ id: m.id, name: m.name, email: m.email || '', balance: m.initial_balance || 0 })}>{t('common:edit')}</button>
                    <button className="btn btn-sm text-danger" onClick={() => handleDeleteMember(m)}>{t('common:delete')}</button>
                  </div>
                )}
              </div>
              <div>
                <div className="member-balance-label">{t('currentBalance')}</div>
                <div className="member-balance-row">
                  <div className={`member-balance-value ${bal < 0 ? 'negative' : ''}`}>{formatMoney(bal)}</div>
                  {canDo(userRole, 'sendMemberNotification') && (
                    <>
                      {bal <= 0 && (
                        <button
                          className="member-noti-btn"
                          onClick={() => handleSendChargeNotification(m, bal, 'push')}
                          disabled={sendingNoti === `${m.id}-push`}
                          title={t('sendChargeNotification')}
                        >
                          {sendingNoti === `${m.id}-push` ? '...' : '\uD83D\uDD14'}
                        </button>
                      )}
                      <button
                        className="member-noti-btn"
                        onClick={() => setEmailModal({ member: m, balance: bal, mode: bal <= 0 ? 'select' : 'custom', title: '', body: '' })}
                        disabled={sendingNoti === `${m.id}-email`}
                        title={t('sendChargeEmail')}
                      >
                        {sendingNoti === `${m.id}-email` ? '...' : '\uD83D\uDCE7'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="member-deposits">
                <strong>{t('depositHistory')}</strong>
                <div>
                  {deps.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('common:none')}</div>
                  ) : (
                    deps.map(d => (
                      <div key={d.id} className="deposit-item">
                        <span>{d.month}</span>
                        <span className="deposit-amount">{formatMoney(d.amount)}</span>
                        {canDo(userRole, 'deleteDeposit') && <button className="deposit-delete" onClick={() => handleDeleteDeposit(d.id)}>&times;</button>}
                      </div>
                    ))
                  )}
                </div>
                {canDo(userRole, 'addDeposit') && (
                  <button
                    className="btn btn-sm btn-primary member-deposit-btn"
                    onClick={() => setDepositModal({ memberId: m.id, month: defaultMonth, amount: '' })}
                  >
                    {t('addDeposit')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!memberModal}
        onClose={() => setMemberModal(null)}
        title={memberModal?.id ? t('editMember') : t('addMemberTitle')}
      >
        {memberModal && (
          <form onSubmit={handleSaveMember}>
            <div className="form-group">
              <label>{t('nameLabel')}</label>
              <input
                type="text"
                value={memberModal.name}
                onChange={e => setMemberModal({ ...memberModal, name: e.target.value })}
                placeholder={t('namePlaceholder')}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('emailLabel')}</label>
              <input
                type="email"
                value={memberModal.email || ''}
                onChange={e => setMemberModal({ ...memberModal, email: e.target.value })}
                placeholder={t('emailPlaceholder')}
              />
            </div>
            {!memberModal.id && (
              <div className="form-group">
                <label>{t('initialBalance')}</label>
                <input
                  type="number"
                  value={memberModal.balance}
                  onChange={e => setMemberModal({ ...memberModal, balance: Number(e.target.value) })}
                  step="100"
                />
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setMemberModal(null)}>{t('common:cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common:save')}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!depositModal}
        onClose={() => setDepositModal(null)}
        title={t('depositTitle')}
      >
        {depositModal && (
          <form onSubmit={handleSaveDeposit}>
            <div className="form-group">
              <label>{t('memberLabel')}</label>
              <select
                value={depositModal.memberId}
                onChange={e => setDepositModal({ ...depositModal, memberId: Number(e.target.value) })}
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('depositMonth')}</label>
              <input
                type="month"
                value={depositModal.month}
                onChange={e => setDepositModal({ ...depositModal, month: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('amount')}</label>
              <input
                type="number"
                value={depositModal.amount}
                onChange={e => setDepositModal({ ...depositModal, amount: e.target.value })}
                placeholder={t('amountPlaceholder')}
                step="1000"
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setDepositModal(null)}>{t('common:cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('deposit')}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!emailModal}
        onClose={() => setEmailModal(null)}
        title={t('emailModalTitle', { name: emailModal?.member?.name })}
      >
        {emailModal && (emailModal.mode === 'select' ? (
          <div className="email-mode-options">
            <button
              type="button"
              className="email-option-btn"
              onClick={() => {
                const { member, balance } = emailModal;
                setEmailModal(null);
                handleSendChargeNotification(member, balance, 'email');
              }}
            >
              <strong>{t('emailOptionCharge')}</strong>
              <span>{t('emailOptionChargeDesc')}</span>
            </button>
            <button
              type="button"
              className="email-option-btn"
              onClick={() => setEmailModal({ ...emailModal, mode: 'custom' })}
            >
              <strong>{t('emailOptionCustom')}</strong>
              <span>{t('emailOptionCustomDesc')}</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendCustomEmail}>
            <div className="form-group">
              <label>{t('emailTitleLabel')}</label>
              <input
                type="text"
                value={emailModal.title}
                onChange={e => setEmailModal({ ...emailModal, title: e.target.value })}
                placeholder={t('emailTitlePlaceholder')}
                maxLength={200}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('emailBodyLabel')}</label>
              <textarea
                value={emailModal.body}
                onChange={e => setEmailModal({ ...emailModal, body: e.target.value })}
                placeholder={t('emailBodyPlaceholder')}
                maxLength={1000}
                rows={5}
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setEmailModal(null)}>{t('common:cancel')}</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingNoti === `${emailModal.member.id}-email`}
              >
                {sendingNoti === `${emailModal.member.id}-email` ? t('sendingEmail') : t('sendEmailBtn')}
              </button>
            </div>
          </form>
        ))}
      </Modal>
    </>
  );
}
