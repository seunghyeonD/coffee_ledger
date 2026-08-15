'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { canDo } from '@/lib/roles';
import { formatMoney, formatDate } from '@/lib/utils';
import Modal from '@/components/Modal';
import OrderModal from '@/components/modals/OrderModal';

export default function Dashboard({ showToast }) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { members, getMemberBalance, getOrdersByMonth, getTotalBalance } = useStore();
  const { company, userRole, updateCompanyInfo } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [accountModal, setAccountModal] = useState(null);

  const bankAccount = company?.bank_account || '';
  const canManageCompany = canDo(userRole, 'manageCompany');

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    try {
      await updateCompanyInfo({ bank_account: accountModal.value.trim() || null });
      setAccountModal(null);
      showToast(t('dashboard:accountSaved'));
    } catch (err) {
      showToast(t('dashboard:accountSaveFailed'));
    }
  };

  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthOrders = getOrdersByMonth(ym);

  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };
  const goPrev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const goNext = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const todayStr = formatDate(new Date());

    const dayOrderMap = {};
    monthOrders.forEach(o => {
      const d = parseInt(o.date.split('-')[2]);
      if (!dayOrderMap[d]) dayOrderMap[d] = [];
      dayOrderMap[d].push(o);
    });

    const cells = [];

    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, otherMonth: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
      const dow = new Date(year, month, d).getDay();
      cells.push({
        day: d,
        dateStr,
        isToday: dateStr === todayStr,
        isWeekend: dow === 0 || dow === 6,
        orders: dayOrderMap[d] || [],
      });
    }

    const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let d = 1; d <= rem; d++) {
      cells.push({ day: d, otherMonth: true });
    }

    return cells;
  }, [year, month, monthOrders, ym]);

  const weekdays = t('common:weekdays', { returnObjects: true });
  const weekends = t('common:weekends', { returnObjects: true });

  return (
    <>
      <div className="page-header">
        <h1>{t('dashboard:title')}</h1>
        {(bankAccount || canManageCompany) && (
          <div className="account-info">
            {bankAccount ? (
              <>
                <span className="account-label">{t('dashboard:depositAccount')}</span>
                <button
                  className="account-copy-btn"
                  onClick={() => {
                    // 계좌번호(숫자·하이픈)만 추출해 복사, 없으면 전체 텍스트
                    const digits = bankAccount.replace(/[^\d-]/g, '');
                    navigator.clipboard.writeText(digits || bankAccount).then(() => {
                      showToast(t('dashboard:accountCopied'));
                    });
                  }}
                >
                  {bankAccount}
                  <span className="copy-icon">{'\u{1F4CB}'}</span>
                </button>
                {canManageCompany && (
                  <button
                    className="menu-icon-btn edit"
                    title={t('dashboard:accountEdit')}
                    onClick={() => setAccountModal({ value: bankAccount })}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <button className="btn" onClick={() => setAccountModal({ value: '' })}>
                {t('dashboard:accountRegister')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="balance-cards">
        <div className="card card-total">
          <div className="card-label">{t('dashboard:accountBalance')}</div>
          <div className="card-value">{formatMoney(getTotalBalance())}</div>
        </div>
        <div className="card card-members">
          <div className="card-label">{t('dashboard:totalMembers')}</div>
          <div className="card-value">{members.length}</div>
        </div>
        <div className="card card-orders">
          <div className="card-label">{t('dashboard:monthlyOrders')}</div>
          <div className="card-value">{t('common:count', { count: monthOrders.length })}</div>
        </div>
        <div className="card card-spent">
          <div className="card-label">{t('dashboard:monthlyExpense')}</div>
          <div className="card-value">{formatMoney(monthOrders.reduce((s, o) => s + o.price, 0))}</div>
        </div>
      </div>

      <div className="calendar-section">
        <div className="calendar-header">
          <button className="btn-icon" onClick={goPrev}>{'\u276E'}</button>
          <h2>{t('common:yearMonth', { year, month: month + 1 })}</h2>
          <button className="btn-icon" onClick={goNext}>{'\u276F'}</button>
          <button className="btn btn-primary" onClick={goToday}>{t('common:today')}</button>
        </div>
        <div className="calendar-grid">
          {weekdays.map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {weekends.map(d => (
            <div key={d} className="calendar-day-header weekend">{d}</div>
          ))}
          {calendarCells.map((cell, i) => (
            <div
              key={i}
              className={`calendar-cell ${cell.otherMonth ? 'other-month' : ''} ${cell.isToday ? 'today' : ''} ${cell.isWeekend ? 'weekend' : ''} ${cell.orders?.length > 0 ? 'has-orders' : ''}`}
              onClick={() => cell.dateStr && setSelectedDate(cell.dateStr)}
            >
              <div className="cell-date">{cell.day}</div>
              {cell.orders?.length > 0 && (
                <>
                  <span className="cell-order-count">{t('common:count', { count: cell.orders.length })}</span>
                  <div className="cell-total">
                    {formatMoney(cell.orders.reduce((s, o) => s + o.price, 0))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="quick-balances">
        <h3>{t('dashboard:memberBalance')}</h3>
        <div className="balance-list">
          {members.map(m => {
            const bal = getMemberBalance(m.id);
            return (
              <div key={m.id} className="balance-item">
                <span className="name">{m.name}</span>
                <span className={`amount ${bal < 0 ? 'negative' : 'positive'}`}>
                  {formatMoney(bal)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!accountModal}
        onClose={() => setAccountModal(null)}
        title={t('dashboard:accountModalTitle')}
        small
      >
        {accountModal && (
          <form onSubmit={handleSaveAccount}>
            <div className="form-group">
              <label>{t('dashboard:depositAccount')}</label>
              <input
                type="text"
                value={accountModal.value}
                onChange={e => setAccountModal({ value: e.target.value })}
                placeholder={t('dashboard:accountPlaceholder')}
                maxLength={60}
                autoFocus
              />
            </div>
            <p className="settings-desc" style={{ fontSize: 12, marginBottom: 16 }}>{t('dashboard:accountDesc')}</p>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setAccountModal(null)}>{t('common:cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common:save')}</button>
            </div>
          </form>
        )}
      </Modal>

      {selectedDate && (
        <OrderModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          showToast={showToast}
        />
      )}
    </>
  );
}
