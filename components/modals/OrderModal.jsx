'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney, DAY_NAMES } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function OrderModal({ date, onClose, showToast }) {
  const { shops, members, getMemberBalance, getOrdersByDate, addOrder, deleteOrder } = useStore();
  const [step, setStep] = useState(1);
  const [shopId, setShopId] = useState(null);
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState(0);
  const [menuSearch, setMenuSearch] = useState('');

  const d = new Date(date);
  const dateLabel = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`;
  const dayOrders = getOrdersByDate(date);
  const selectedShop = shops.find(s => s.id === shopId);

  const handleShopSelect = (id) => {
    setShopId(id);
    setStep(2);
  };

  const handleMenuSelect = (menu) => {
    if (menu.price === 0) {
      const price = prompt('가격을 입력해주세요 (원):');
      if (!price) return;
      const p = Number(price);
      if (isNaN(p) || p <= 0) { showToast('올바른 가격을 입력해주세요'); return; }
      const name = prompt('메뉴명을 입력해주세요:', '기타') || '기타';
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
      showToast('주문이 등록되었습니다!');
    } catch (e) {
      showToast('오류: ' + (e.message || '주문 등록 실패'));
    }
  };

  const handleDeleteOrder = async (id) => {
    if (confirm('이 주문을 삭제하시겠습니까?')) {
      try {
        await deleteOrder(id);
        showToast('주문이 삭제되었습니다.');
      } catch (e) {
        showToast('오류: ' + (e.message || '삭제 실패'));
      }
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="주문 등록" large>
      <div className="order-date-display">{dateLabel}</div>

      {/* Step 1: Shop */}
      {step === 1 && (
        <div className="order-step">
          <h3>1. 업체 선택</h3>
          {shops.length === 0 ? (
            <div className="empty-state">등록된 업체가 없습니다. 메뉴 관리에서 추가해주세요.</div>
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

      {/* Step 2: Menu */}
      {step === 2 && selectedShop && (
        <div className="order-step">
          <h3>
            2. 메뉴 선택
            <button className="btn-link" onClick={() => { setStep(1); setMenuSearch(''); }}>&larr; 업체 다시 선택</button>
          </h3>
          <input
            type="text"
            className="menu-search-input"
            placeholder="메뉴 검색..."
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
          />
          <div className="menu-selector">
            {selectedShop.menus
              .filter(m => !menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase()))
              .map(m => (
                <button key={m.id} className="menu-select-btn" onClick={() => handleMenuSelect(m)}>
                  <div className="menu-btn-name">{m.name}</div>
                  <div className="menu-btn-price">{m.price > 0 ? formatMoney(m.price) : '직접 입력'}</div>
                </button>
              ))}
            {selectedShop.menus.filter(m => !menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase())).length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>검색 결과가 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Member */}
      {step === 3 && (
        <div className="order-step">
          <h3>
            3. 멤버 선택
            <button className="btn-link" onClick={() => setStep(2)}>&larr; 메뉴 다시 선택</button>
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

      {/* Day Orders */}
      <div className="day-orders-section">
        <h3>이 날의 주문</h3>
        {dayOrders.length === 0 ? (
          <div className="empty-state">이 날의 주문이 없습니다.</div>
        ) : (
          dayOrders.map(o => {
            const member = members.find(m => m.id === o.member_id);
            return (
              <div key={o.id} className="day-order-item">
                <div className="order-info">
                  <span className="order-member">{member?.name || '?'}</span>
                  <span className="order-menu">{o.menu_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="order-price">{formatMoney(o.price)}</span>
                  <button className="day-order-delete" onClick={() => handleDeleteOrder(o.id)}>&times;</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
