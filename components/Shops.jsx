'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function Shops({ showToast }) {
  const { shops, addShop, updateShop, deleteShop, addMenu, updateMenu, deleteMenu } = useStore();
  const [shopModal, setShopModal] = useState(null);
  const [menuModal, setMenuModal] = useState(null);

  const handleSaveShop = async (e) => {
    e.preventDefault();
    try {
      if (shopModal.id) {
        await updateShop(shopModal.id, shopModal.name, shopModal.color);
        showToast('업체가 수정되었습니다.');
      } else {
        await addShop(shopModal.name, shopModal.color);
        showToast('업체가 추가되었습니다!');
      }
      setShopModal(null);
    } catch (e) {
      showToast('오류: ' + (e.message || '저장 실패'));
    }
  };

  const handleDeleteShop = async (id) => {
    if (confirm('이 업체를 삭제하시겠습니까?')) {
      try {
        await deleteShop(id);
        showToast('업체가 삭제되었습니다.');
      } catch (e) {
        showToast('오류: ' + (e.message || '삭제 실패'));
      }
    }
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      if (menuModal.menuId) {
        await updateMenu(menuModal.shopId, menuModal.menuId, menuModal.name, menuModal.price);
        showToast('메뉴가 수정되었습니다.');
      } else {
        await addMenu(menuModal.shopId, menuModal.name, menuModal.price);
        showToast('메뉴가 추가되었습니다!');
      }
      setMenuModal(null);
    } catch (e) {
      showToast('오류: ' + (e.message || '저장 실패'));
    }
  };

  const handleDeleteMenu = async (shopId, menuId) => {
    if (confirm('이 메뉴를 삭제하시겠습니까?')) {
      try {
        await deleteMenu(shopId, menuId);
        showToast('메뉴가 삭제되었습니다.');
      } catch (e) {
        showToast('오류: ' + (e.message || '삭제 실패'));
      }
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>메뉴 관리</h1>
        <button className="btn btn-primary" onClick={() => setShopModal({ name: '', color: '#4a90d9' })}>
          + 업체 추가
        </button>
      </div>

      <div className="shops-grid">
        {shops.map(s => (
          <div key={s.id} className="shop-card">
            <div className="shop-card-header" style={{ background: s.color }}>
              <h3>{s.name}</h3>
              <div className="shop-actions">
                <button className="btn btn-sm" onClick={() => setShopModal({ id: s.id, name: s.name, color: s.color })}>수정</button>
                <button className="btn btn-sm" onClick={() => handleDeleteShop(s.id)}>삭제</button>
              </div>
            </div>
            <div className="shop-menu-list">
              {s.menus.length === 0 ? (
                <div className="empty-state">메뉴가 없습니다.</div>
              ) : (
                s.menus.map(m => (
                  <div key={m.id} className="menu-item">
                    <span className="menu-item-name">{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="menu-item-price">{formatMoney(m.price)}</span>
                      <div className="menu-item-actions">
                        <button className="btn btn-sm" onClick={() => setMenuModal({ shopId: s.id, menuId: m.id, name: m.name, price: m.price })}>수정</button>
                        <button className="btn btn-sm text-danger" onClick={() => handleDeleteMenu(s.id, m.id)}>삭제</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button className="btn-add-menu" onClick={() => setMenuModal({ shopId: s.id, name: '', price: '' })}>
                + 메뉴 추가
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Shop Modal */}
      <Modal open={!!shopModal} onClose={() => setShopModal(null)} title={shopModal?.id ? '업체 수정' : '업체 추가'}>
        {shopModal && (
          <form onSubmit={handleSaveShop}>
            <div className="form-group">
              <label>업체명</label>
              <input type="text" value={shopModal.name} onChange={e => setShopModal({ ...shopModal, name: e.target.value })} placeholder="예: 스타벅스" required />
            </div>
            <div className="form-group">
              <label>색상</label>
              <input type="color" value={shopModal.color} onChange={e => setShopModal({ ...shopModal, color: e.target.value })} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShopModal(null)}>취소</button>
              <button type="submit" className="btn btn-primary">저장</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Menu Modal */}
      <Modal open={!!menuModal} onClose={() => setMenuModal(null)} title={menuModal?.menuId ? '메뉴 수정' : '메뉴 추가'}>
        {menuModal && (
          <form onSubmit={handleSaveMenu}>
            <div className="form-group">
              <label>메뉴명</label>
              <input type="text" value={menuModal.name} onChange={e => setMenuModal({ ...menuModal, name: e.target.value })} placeholder="예: 아메리카노" required />
            </div>
            <div className="form-group">
              <label>가격 (원)</label>
              <input type="number" value={menuModal.price} onChange={e => setMenuModal({ ...menuModal, price: e.target.value })} placeholder="예: 2300" step="100" required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setMenuModal(null)}>취소</button>
              <button type="submit" className="btn btn-primary">저장</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
