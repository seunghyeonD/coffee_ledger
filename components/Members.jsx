'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import { canDo } from '@/lib/roles';
import Modal from '@/components/Modal';

export default function Members({ showToast }) {
  const { members, getMemberBalance, getDepositsByMember, addMember, updateMember, deleteMember, addDeposit, deleteDeposit, companyId } = useStore();
  const { userRole } = useAuth();
  const [sendingNoti, setSendingNoti] = useState(null); // memberId being sent
  const [memberModal, setMemberModal] = useState(null); // null | { id?, name, balance }
  const [depositModal, setDepositModal] = useState(null); // null | { memberId, month, amount }

  const handleSaveMember = async (e) => {
    e.preventDefault();
    try {
      if (memberModal.id) {
        await updateMember(memberModal.id, memberModal.name);
        showToast('멤버가 수정되었습니다.');
      } else {
        await addMember(memberModal.name, memberModal.balance || 0);
        showToast('멤버가 추가되었습니다!');
      }
      setMemberModal(null);
    } catch (e) {
      showToast('오류: ' + (e.message || '저장 실패'));
    }
  };

  const handleDeleteMember = async (m) => {
    if (confirm(`'${m.name}' 멤버를 삭제하시겠습니까?\n관련된 모든 주문과 입금 내역도 삭제됩니다.`)) {
      try {
        await deleteMember(m.id);
        showToast('멤버가 삭제되었습니다.');
      } catch (e) {
        showToast('오류: ' + (e.message || '삭제 실패'));
      }
    }
  };

  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    try {
      await addDeposit(depositModal.memberId, depositModal.month, depositModal.amount);
      setDepositModal(null);
      showToast('충전이 완료되었습니다!');
    } catch (e) {
      showToast('오류: ' + (e.message || '충전 실패'));
    }
  };

  const handleDeleteDeposit = async (id) => {
    if (confirm('이 충전 내역을 삭제하시겠습니까?')) {
      try {
        await deleteDeposit(id);
        showToast('충전 내역이 삭제되었습니다.');
      } catch (e) {
        showToast('오류: ' + (e.message || '삭제 실패'));
      }
    }
  };

  const handleSendChargeNotification = async (member, balance) => {
    setSendingNoti(member.id);
    try {
      const res = await fetch('/api/notifications/send-to-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          memberName: member.name,
          balance,
        }),
      });
      const result = await res.json();
      if (result.matched === 0) {
        showToast(`'${member.name}'과 일치하는 유저를 찾지 못했습니다. 설정 > 역할 관리에서 유저 이름을 확인해주세요.`);
      } else if (result.sent === 0) {
        showToast('매칭된 유저가 알림을 등록하지 않았습니다.');
      } else {
        showToast(`${member.name}님에게 충전 요청 알림을 보냈습니다.`);
      }
    } catch (e) {
      showToast('알림 발송에 실패했습니다.');
    } finally {
      setSendingNoti(null);
    }
  };

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <>
      <div className="page-header">
        <h1>멤버 관리</h1>
        {canDo(userRole, 'addMember') && (
          <button className="btn btn-primary" onClick={() => setMemberModal({ name: '', balance: 0 })}>
            + 멤버 추가
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
                    <button className="btn btn-sm" onClick={() => setMemberModal({ id: m.id, name: m.name, balance: m.initial_balance || 0 })}>수정</button>
                    <button className="btn btn-sm text-danger" onClick={() => handleDeleteMember(m)}>삭제</button>
                  </div>
                )}
              </div>
              <div>
                <div className="member-balance-label">현재 잔액</div>
                <div className="member-balance-row">
                  <div className={`member-balance-value ${bal < 0 ? 'negative' : ''}`}>{formatMoney(bal)}</div>
                  {bal <= 0 && canDo(userRole, 'sendMemberNotification') && (
                    <button
                      className="member-noti-btn"
                      onClick={() => handleSendChargeNotification(m, bal)}
                      disabled={sendingNoti === m.id}
                      title="충전 요청 알림 보내기"
                    >
                      {sendingNoti === m.id ? '...' : '\uD83D\uDD14'}
                    </button>
                  )}
                </div>
              </div>
              <div className="member-deposits">
                <strong>충전 내역</strong>
                <div>
                  {deps.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>없음</div>
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
                    + 충전
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Modal */}
      <Modal
        open={!!memberModal}
        onClose={() => setMemberModal(null)}
        title={memberModal?.id ? '멤버 수정' : '멤버 추가'}
      >
        {memberModal && (
          <form onSubmit={handleSaveMember}>
            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={memberModal.name}
                onChange={e => setMemberModal({ ...memberModal, name: e.target.value })}
                placeholder="예: 김범석(Negan)"
                required
              />
            </div>
            {!memberModal.id && (
              <div className="form-group">
                <label>초기 잔액 (원)</label>
                <input
                  type="number"
                  value={memberModal.balance}
                  onChange={e => setMemberModal({ ...memberModal, balance: Number(e.target.value) })}
                  step="100"
                />
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setMemberModal(null)}>취소</button>
              <button type="submit" className="btn btn-primary">저장</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Deposit Modal */}
      <Modal
        open={!!depositModal}
        onClose={() => setDepositModal(null)}
        title="충전금 입금"
      >
        {depositModal && (
          <form onSubmit={handleSaveDeposit}>
            <div className="form-group">
              <label>멤버</label>
              <select
                value={depositModal.memberId}
                onChange={e => setDepositModal({ ...depositModal, memberId: Number(e.target.value) })}
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>충전 월</label>
              <input
                type="month"
                value={depositModal.month}
                onChange={e => setDepositModal({ ...depositModal, month: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>금액 (원)</label>
              <input
                type="number"
                value={depositModal.amount}
                onChange={e => setDepositModal({ ...depositModal, amount: e.target.value })}
                placeholder="예: 50000"
                step="1000"
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setDepositModal(null)}>취소</button>
              <button type="submit" className="btn btn-primary">입금</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
