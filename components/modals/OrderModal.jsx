'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import { canDo } from '@/lib/roles';
import Modal from '@/components/Modal';

export default function OrderModal({ date, onClose, showToast }) {
  const { t } = useTranslation(['orders', 'common']);
  const { shops, members, getMemberBalance, getOrdersByDate, addOrder, deleteOrder } = useStore();
  const { userRole } = useAuth();
  const [step, setStep] = useState(1);
  const [shopId, setShopId] = useState(null);
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState(0);
  const [menuSearch, setMenuSearch] = useState('');
  const [extraTarget, setExtraTarget] = useState(null); // { orderId, memberId, memberName }
  const [extraAmount, setExtraAmount] = useState('');
  const [extraNote, setExtraNote] = useState('');

  const d = new Date(date);
  const dayNames = t('common:dayNames', { returnObjects: true });
  const dateLabel = t('dateFormat', { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dayName: dayNames[d.getDay()] });
  const dayOrders = getOrdersByDate(date);
  const selectedShop = shops.find(s => s.id === shopId);

  const handleShopSelect = (id) => {
    setShopId(id);
    setStep(2);
  };

  const handleMenuSelect = (menu) => {
    if (menu.price === 0) {
      const price = prompt(t('enterPrice'));
      if (!price) return;
      const p = Number(price);
      if (isNaN(p) || p <= 0) { showToast(t('invalidPrice')); return; }
      const name = prompt(t('enterMenuName'), t('customMenu')) || t('customMenu');
      setMenuName(name);
      setMenuPrice(p);
    } else {
      setMenuName(menu.name);
      setMenuPrice(menu.price);
    }
    setStep(3);
  };

  const handleMemberSelect = async (memberId) => {
    try {
      await addOrder(date, memberId, shopId, menuName, menuPrice);
      showToast(t('orderRegistered'));
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('orderFailed') }));
    }
  };

  const handleExtraAmount = async () => {
    const amount = Number(extraAmount);
    if (isNaN(amount) || amount === 0) {
      showToast(t('invalidPrice'));
      return;
    }
    try {
      const label = extraNote.trim() || t('extraAmount');
      await addOrder(date, extraTarget.memberId, extraTarget.shopId, label, amount);
      showToast(t('orderRegistered'));
      setExtraTarget(null);
      setExtraAmount('');
      setExtraNote('');
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('orderFailed') }));
    }
  };

  const handleDeleteOrder = async (id) => {
    if (confirm(t('confirmDeleteOrder'))) {
      try {
        await deleteOrder(id);
        showToast(t('orderDeleted'));
      } catch (e) {
        showToast(t('common:error', { message: e.message || t('common:deleteFailed') }));
      }
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={t('title')} large>
      <div className="order-date-display">{dateLabel}</div>

      {step === 1 && canDo(userRole, 'addOrder') && (
        <div className="order-step">
          <h3>{t('step1')}</h3>
          {shops.length === 0 ? (
            <div className="empty-state">{t('noShops')}</div>
          ) : (
            <div className="shop-selector">
              {shops.map(s => (
                <button
                  key={s.id}
                  className="shop-select-btn"
                  style={{ borderColor: s.color, color: s.color }}
                  onClick={() => handleShopSelect(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedShop && (
        <div className="order-step">
          <h3>
            {t('step2')}
            <button className="btn-link" onClick={() => { setStep(1); setMenuSearch(''); }}>{t('reselectShop')}</button>
          </h3>
          <input
            type="text"
            className="menu-search-input"
            placeholder={t('searchMenu')}
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
          />
          <div className="menu-selector">
            {selectedShop.menus
              .filter(m => !menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase()))
              .map(m => (
                <button key={m.id} className="menu-select-btn" onClick={() => handleMenuSelect(m)}>
                  <div className="menu-btn-name">{m.name}</div>
                  <div className="menu-btn-price">{m.price > 0 ? formatMoney(m.price) : t('customInput')}</div>
                </button>
              ))}
            {selectedShop.menus.filter(m => !menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase())).length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>{t('noSearchResults')}</div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="order-step">
          <h3>
            {t('step3')}
            <button className="btn-link" onClick={() => setStep(2)}>{t('reselectMenu')}</button>
          </h3>
          <div className="selected-menu-info">
            <span>{menuName}</span>
            <span>{formatMoney(menuPrice)}</span>
          </div>
          <div className="member-selector">
            {members.map(m => (
              <button key={m.id} className="member-select-btn" onClick={() => handleMemberSelect(m.id)}>
                <div>{m.name}</div>
                <div className="member-btn-balance">{formatMoney(getMemberBalance(m.id))}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="day-orders-section">
        <h3>{t('todayOrders')}</h3>
        {dayOrders.length === 0 ? (
          <div className="empty-state">{t('noTodayOrders')}</div>
        ) : (
          dayOrders.map(o => {
            const member = members.find(m => m.id === o.member_id);
            const isExtraTarget = extraTarget?.orderId === o.id;
            return (
              <div key={o.id}>
                <div className="day-order-item">
                  <div className="order-info">
                    <span
                      className="order-member clickable"
                      onClick={() => {
                        if (isExtraTarget) {
                          setExtraTarget(null);
                          setExtraAmount('');
                          setExtraNote('');
                        } else {
                          setExtraTarget({ orderId: o.id, memberId: o.member_id, shopId: o.shop_id, memberName: member?.name });
                          setExtraAmount('');
                          setExtraNote('');
                        }
                      }}
                    >{member?.name || '?'}</span>
                    <span className="order-menu">{o.menu_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="order-price">{formatMoney(o.price)}</span>
                    {canDo(userRole, 'deleteOrder') && <button className="day-order-delete" onClick={() => handleDeleteOrder(o.id)}>&times;</button>}
                  </div>
                </div>
                {isExtraTarget && (
                  <div className="extra-amount-row">
                    <span className="extra-amount-label">{t('extraAmountFor', { name: member?.name })}</span>
                    <input
                      type="text"
                      className="extra-amount-input"
                      placeholder={t('enterExtraNote')}
                      value={extraNote}
                      onChange={e => setExtraNote(e.target.value)}
                    />
                    <div className="extra-amount-input-group">
                      <input
                        type="number"
                        className="extra-amount-input"
                        placeholder={t('enterExtraAmount')}
                        value={extraAmount}
                        onChange={e => setExtraAmount(e.target.value)}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleExtraAmount()}
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleExtraAmount}>{t('common:add')}</button>
                      <button className="btn btn-sm" onClick={() => { setExtraTarget(null); setExtraAmount(''); setExtraNote(''); }}>{t('common:cancel')}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
