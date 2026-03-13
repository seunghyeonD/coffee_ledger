'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import { canDo } from '@/lib/roles';
import Modal from '@/components/Modal';
import NearbySearch from '@/components/NearbySearch';

export default function Shops({ showToast }) {
  const { t } = useTranslation(['shops', 'common']);
  const { shops, addShop, updateShop, deleteShop, addMenu, addMenusBulk, updateMenu, deleteMenu } = useStore();
  const { userRole } = useAuth();
  const [shopModal, setShopModal] = useState(null);
  const [menuModal, setMenuModal] = useState(null);
  const [bulkModal, setBulkModal] = useState(null);
  const [showNearby, setShowNearby] = useState(false);
  const [expandedShop, setExpandedShop] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSaveShop = async (e) => {
    e.preventDefault();
    try {
      if (shopModal.id) {
        await updateShop(shopModal.id, shopModal.name, shopModal.color);
        showToast(t('shopEdited'));
      } else {
        await addShop(shopModal.name, shopModal.color);
        showToast(t('shopAdded'));
      }
      setShopModal(null);
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('common:saveFailed') }));
    }
  };

  const handleDeleteShop = async (id) => {
    if (confirm(t('confirmDeleteShop'))) {
      try {
        await deleteShop(id);
        showToast(t('shopDeleted'));
      } catch (e) {
        showToast(t('common:error', { message: e.message || t('common:saveFailed') }));
      }
    }
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      if (menuModal.menuId) {
        await updateMenu(menuModal.shopId, menuModal.menuId, menuModal.name, menuModal.price);
        showToast(t('menuEdited'));
      } else {
        await addMenu(menuModal.shopId, menuModal.name, menuModal.price);
        showToast(t('menuAdded'));
      }
      setMenuModal(null);
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('common:saveFailed') }));
    }
  };

  const handleDeleteMenu = async (shopId, menuId) => {
    if (confirm(t('confirmDeleteMenu'))) {
      try {
        await deleteMenu(shopId, menuId);
        showToast(t('menuDeleted'));
      } catch (e) {
        showToast(t('common:error', { message: e.message || t('common:saveFailed') }));
      }
    }
  };

  const parseBulkText = (text) => {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const match = line.match(/^(.+?)\s*[,\t]\s*([0-9,]+)\s*원?\s*$/);
        if (match) return { name: match[1].trim(), price: Number(match[2].replace(/,/g, '')) };
        const match2 = line.match(/^([0-9,]+)\s*원?\s*[,\t]\s*(.+)$/);
        if (match2) return { name: match2[2].trim(), price: Number(match2[1].replace(/,/g, '')) };
        const match3 = line.match(/^(.+?)\s+([0-9,]+)\s*원?\s*$/);
        if (match3) return { name: match3[1].trim(), price: Number(match3[2].replace(/,/g, '')) };
        return { name: line, price: 0, invalid: true };
      });
  };

  const handleBulkTextChange = (text) => {
    setBulkModal(prev => ({ ...prev, text, parsed: parseBulkText(text) }));
  };

  const handleBulkImport = async () => {
    const valid = bulkModal.parsed.filter(m => !m.invalid && m.name && m.price > 0);
    if (valid.length === 0) {
      showToast(t('noBatchMenus'));
      return;
    }
    try {
      await addMenusBulk(bulkModal.shopId, valid);
      showToast(t('batchRegistered', { count: valid.length }));
      setBulkModal(null);
    } catch (e) {
      showToast(t('common:error', { message: e.message || t('batchFailed') }));
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>{t('title')}</h1>
        {canDo(userRole, 'addShop') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setShowNearby(true)}>
              {'\u{1F4CD}'} {t('findNearbyCafe')}
            </button>
            <button className="btn btn-primary" onClick={() => setShopModal({ name: '', color: '#4a90d9' })}>
              {t('addShop')}
            </button>
          </div>
        )}
      </div>

      <div className="shops-grid">
        {shops.map(s => (
          <div key={s.id} className={`shop-card ${isMobile && expandedShop !== s.id ? 'shop-collapsed' : ''}`}>
            <div
              className="shop-card-header"
              style={{ background: s.color }}
              onClick={() => isMobile && setExpandedShop(expandedShop === s.id ? null : s.id)}
            >
              <h3>
                {s.name}
                {isMobile && <span className="shop-toggle-icon">{expandedShop === s.id ? '\u25B2' : '\u25BC'}</span>}
                {isMobile && <span className="shop-menu-count">{t('menuCount', { count: s.menus.length })}</span>}
              </h3>
              {canDo(userRole, 'updateShop') && (
                <div className="shop-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => setShopModal({ id: s.id, name: s.name, color: s.color })}>{t('common:edit')}</button>
                  <button className="btn btn-sm" onClick={() => handleDeleteShop(s.id)}>{t('common:delete')}</button>
                </div>
              )}
            </div>
            <div className="shop-menu-list">
              {s.menus.length === 0 ? (
                <div className="empty-state">{t('noMenu')}</div>
              ) : (
                s.menus.map(m => (
                  <div key={m.id} className="menu-item">
                    <span className="menu-item-name">{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="menu-item-price">{formatMoney(m.price)}</span>
                      {canDo(userRole, 'updateMenu') && (
                      <div className="menu-item-actions">
                        <button className="btn btn-sm" onClick={() => setMenuModal({ shopId: s.id, menuId: m.id, name: m.name, price: m.price })}>{t('common:edit')}</button>
                        <button className="btn btn-sm text-danger" onClick={() => handleDeleteMenu(s.id, m.id)}>{t('common:delete')}</button>
                      </div>
                    )}
                    </div>
                  </div>
                ))
              )}
              {canDo(userRole, 'addMenu') && (
                <div className="shop-menu-add-actions">
                  <button className="btn-add-menu" onClick={() => setMenuModal({ shopId: s.id, name: '', price: '' })}>
                    {t('addMenu')}
                  </button>
                  <button className="btn-add-menu btn-bulk-menu" onClick={() => setBulkModal({ shopId: s.id, text: '', parsed: [] })}>
                    {t('batchRegister')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNearby && (
        <NearbySearch
          onClose={() => setShowNearby(false)}
          onSelect={async (cafe) => {
            try {
              await addShop(cafe.name, '#4a90d9');
              showToast(t('cafeAdded', { name: cafe.name }));
              setShowNearby(false);
            } catch (e) {
              showToast(t('common:error', { message: e.message || t('addFailed') }));
            }
          }}
        />
      )}

      <Modal open={!!shopModal} onClose={() => setShopModal(null)} title={shopModal?.id ? t('editShop') : t('addShopTitle')}>
        {shopModal && (
          <form onSubmit={handleSaveShop}>
            <div className="form-group">
              <label>{t('shopName')}</label>
              <input type="text" value={shopModal.name} onChange={e => setShopModal({ ...shopModal, name: e.target.value })} placeholder={t('shopNamePlaceholder')} required />
            </div>
            <div className="form-group">
              <label>{t('color')}</label>
              <input type="color" value={shopModal.color} onChange={e => setShopModal({ ...shopModal, color: e.target.value })} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShopModal(null)}>{t('common:cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common:save')}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!menuModal} onClose={() => setMenuModal(null)} title={menuModal?.menuId ? t('editMenu') : t('addMenuTitle')}>
        {menuModal && (
          <form onSubmit={handleSaveMenu}>
            <div className="form-group">
              <label>{t('menuName')}</label>
              <input type="text" value={menuModal.name} onChange={e => setMenuModal({ ...menuModal, name: e.target.value })} placeholder={t('menuNamePlaceholder')} required />
            </div>
            <div className="form-group">
              <label>{t('price')}</label>
              <input type="number" value={menuModal.price} onChange={e => setMenuModal({ ...menuModal, price: e.target.value })} placeholder={t('pricePlaceholder')} step="100" required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setMenuModal(null)}>{t('common:cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common:save')}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!bulkModal} onClose={() => setBulkModal(null)} title={t('batchTitle')}>
        {bulkModal && (
          <div className="bulk-import">
            <p className="bulk-import-desc" style={{ whiteSpace: 'pre-line' }}>
              {t('batchDesc')}
            </p>
            <div className="bulk-import-format">
              <strong>{t('supportedFormats')}</strong>
              <code>아메리카노 4500</code>
              <code>카페라떼, 5000</code>
              <code>바닐라라떼{'\t'}5500</code>
            </div>
            <textarea
              className="bulk-import-textarea"
              value={bulkModal.text}
              onChange={e => handleBulkTextChange(e.target.value)}
              placeholder={'아메리카노 4500\n카페라떼 5000\n바닐라라떼 5500'}
              rows={8}
            />
            {bulkModal.parsed.length > 0 && (
              <div className="bulk-import-preview">
                <strong>{t('preview')} ({t('recognized', { count: bulkModal.parsed.filter(m => !m.invalid).length })})</strong>
                <div className="bulk-import-list">
                  {bulkModal.parsed.map((m, i) => (
                    <div key={i} className={`bulk-import-item ${m.invalid ? 'invalid' : ''}`}>
                      <span>{m.name}</span>
                      <span>{m.invalid ? t('invalid') : formatMoney(m.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setBulkModal(null)}>{t('common:cancel')}</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBulkImport}
                disabled={!bulkModal.parsed.some(m => !m.invalid && m.price > 0)}
              >
                {t('registerMenus', { count: bulkModal.parsed.filter(m => !m.invalid && m.price > 0).length })}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
