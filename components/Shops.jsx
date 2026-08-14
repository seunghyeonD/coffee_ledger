'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { authFetch } from '@/lib/api-fetch';
import { formatMoney } from '@/lib/utils';
import { canDo } from '@/lib/roles';
import Modal from '@/components/Modal';
import NearbySearch from '@/components/NearbySearch';

// 메뉴판 사진을 리사이즈해서 base64(JPEG)로 변환
// 1024px가 인식 정확도를 유지하는 최소 크기 (실측: 800px부터 글자 깨짐)
function imageToBase64(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

// 메뉴명 키워드로 카테고리 추정 (표시·필터용 — 데이터 변경 없음)
const CATEGORY_RULES = [
  ['라떼', ['라떼', '라테']],
  ['커피', ['커피', '아메리카노', '에스프레소', '콜드브루', '모카', '마키아토', '아포가토', '아포카토', '비엔나']],
  ['스무디', ['스무디', '프라페', '쉐이크', '셰이크', '요거트', '주스']],
  ['에이드', ['에이드', '아이스티', '피지오']],
  ['티', ['티', '차', '홍차', '녹차', '허브', '블렌드']],
  ['디저트', ['케이크', '케익', '브레드', '쿠키', '크로플', '와플', '베이글', '스콘', '마카롱', '빵', '샌드위치', '토스트', '버거', '세트']],
];

const CATEGORY_EMOJI = {
  '라떼': '🥛', '커피': '☕', '스무디': '🧋', '에이드': '🍹',
  '티': '🍵', '디저트': '🍰', '기타': '🍽️',
};

function getCategory(name) {
  for (const [cat, keywords] of CATEGORY_RULES) {
    if (keywords.some(k => name.includes(k))) return cat;
  }
  return '기타';
}

export default function Shops({ showToast }) {
  const { t } = useTranslation(['shops', 'common']);
  const { shops, addShop, updateShop, deleteShop, addMenu, addMenusBulk, updateMenu, deleteMenu, companyId } = useStore();
  const { userRole } = useAuth();
  const [shopModal, setShopModal] = useState(null);
  const [menuModal, setMenuModal] = useState(null);
  const [bulkModal, setBulkModal] = useState(null);
  const [showNearby, setShowNearby] = useState(false);
  const [expandedShop, setExpandedShop] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [menuSearch, setMenuSearch] = useState({});
  const [menuFilter, setMenuFilter] = useState({});
  const photoInputRef = useRef(null);

  // 하단 통계
  const allMenus = shops.flatMap(s => s.menus);
  const avgPrice = allMenus.length > 0
    ? Math.round(allMenus.reduce((sum, m) => sum + m.price, 0) / allMenus.length)
    : 0;

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

  const handleMenuPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setExtracting(true);
    try {
      const image = await imageToBase64(file);
      const res = await authFetch('/api/menus/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, image, mimeType: 'image/jpeg' }),
        signal: AbortSignal.timeout(75000),
      });

      if (res.status === 429) {
        showToast(t('extractRateLimited'));
        return;
      }
      if (!res.ok) {
        showToast(t('extractFailed'));
        return;
      }

      const { menus } = await res.json();
      if (!menus || menus.length === 0) {
        showToast(t('extractEmpty'));
        return;
      }

      const lines = menus.map(m => `${m.name} ${m.price}`).join('\n');
      setBulkModal(prev => {
        const text = prev.text.trim() ? `${prev.text.trim()}\n${lines}` : lines;
        return { ...prev, text, parsed: parseBulkText(text) };
      });
      showToast(t('extractSuccess', { count: menus.length }));
    } catch (err) {
      showToast(t('extractFailed'));
    } finally {
      setExtracting(false);
    }
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
        <div>
          <h1>{t('title')}</h1>
          <p className="page-subtitle">{t('subtitle')}</p>
        </div>
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
        {shops.map(s => {
          const search = (menuSearch[s.id] || '').trim().toLowerCase();
          const filter = menuFilter[s.id] || '\uC804\uCCB4';
          const categories = [...new Set(s.menus.map(m => getCategory(m.name)))];
          const visibleMenus = s.menus.filter(m => {
            if (search && !m.name.toLowerCase().includes(search)) return false;
            if (filter !== '\uC804\uCCB4' && getCategory(m.name) !== filter) return false;
            return true;
          });

          return (
          <div key={s.id} className={`shop-card ${isMobile && expandedShop !== s.id ? 'shop-collapsed' : ''}`}>
            <div
              className="shop-card-top"
              onClick={() => isMobile && setExpandedShop(expandedShop === s.id ? null : s.id)}
            >
              <span className="shop-avatar" style={{ background: s.color }}>{'\u2615'}</span>
              <h3 className="shop-title">
                {s.name}
                {isMobile && <span className="shop-toggle-icon">{expandedShop === s.id ? '\u25B2' : '\u25BC'}</span>}
              </h3>
              <span className="shop-count-badge">{s.menus.length}</span>
              {canDo(userRole, 'updateShop') && (
                <div className="shop-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => setShopModal({ id: s.id, name: s.name, color: s.color })}>{t('common:edit')}</button>
                  <button className="btn btn-sm text-danger" onClick={() => handleDeleteShop(s.id)}>{t('common:delete')}</button>
                </div>
              )}
            </div>

            <div className="shop-card-body">
              {s.menus.length > 0 && (
                <>
                  <div className="menu-search">
                    <input
                      type="text"
                      value={menuSearch[s.id] || ''}
                      onChange={e => setMenuSearch(prev => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder={t('searchMenu')}
                    />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>

                  {categories.length > 1 && (
                    <div className="menu-chips">
                      {['\uC804\uCCB4', ...categories].map(cat => (
                        <button
                          key={cat}
                          className={`menu-chip ${filter === cat ? 'active' : ''}`}
                          style={filter === cat ? { background: s.color, borderColor: s.color } : undefined}
                          onClick={() => setMenuFilter(prev => ({ ...prev, [s.id]: cat }))}
                        >
                          {cat === '\uC804\uCCB4' ? t('categoryAll') : cat}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="shop-menu-list">
                {s.menus.length === 0 ? (
                  <div className="empty-state">{t('noMenu')}</div>
                ) : visibleMenus.length === 0 ? (
                  <div className="empty-state">{t('noSearchResult')}</div>
                ) : (
                  visibleMenus.map(m => (
                    <div key={m.id} className="menu-row">
                      <span className="menu-thumb">{CATEGORY_EMOJI[getCategory(m.name)]}</span>
                      <div className="menu-info">
                        <span className="menu-name">{m.name}</span>
                        <span className="menu-price">{formatMoney(m.price)}</span>
                      </div>
                      {canDo(userRole, 'updateMenu') && (
                        <div className="menu-row-actions">
                          <button
                            className="menu-icon-btn edit"
                            title={t('common:edit')}
                            onClick={() => setMenuModal({ shopId: s.id, menuId: m.id, name: m.name, price: m.price })}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>
                          <button
                            className="menu-icon-btn del"
                            title={t('common:delete')}
                            onClick={() => handleDeleteMenu(s.id, m.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {canDo(userRole, 'addMenu') && (
                <div className="shop-menu-add-actions">
                  <button
                    className="menu-add-dashed"
                    style={{ color: s.color, borderColor: s.color }}
                    onClick={() => setMenuModal({ shopId: s.id, name: '', price: '' })}
                  >
                    {t('addMenu')}
                  </button>
                  <button className="menu-bulk-outline" onClick={() => setBulkModal({ shopId: s.id, text: '', parsed: [] })}>
                    {'\u2601\uFE0F'} {t('batchRegister')}
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <div className="shops-stats">
        <div className="stat-card">
          <div>
            <div className="stat-label">{t('totalMenus')}</div>
            <div className="stat-value">{allMenus.length}<span className="stat-unit">{t('countUnit')}</span></div>
          </div>
          <span className="stat-icon" style={{ background: 'var(--primary)' }}>{'\u{1F4CB}'}</span>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">{t('totalShops')}</div>
            <div className="stat-value">{shops.length}<span className="stat-unit">{t('countUnit')}</span></div>
          </div>
          <span className="stat-icon" style={{ background: 'var(--primary-light)' }}>{'\u{1F3EA}'}</span>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">{t('avgPrice')}</div>
            <div className="stat-value">{avgPrice.toLocaleString()}<span className="stat-unit">{t('wonUnit')}</span></div>
          </div>
          <span className="stat-icon" style={{ background: 'var(--accent)' }}>{'\u20A9'}</span>
        </div>
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
            <button
              type="button"
              className="btn-photo-extract"
              onClick={() => photoInputRef.current?.click()}
              disabled={extracting}
            >
              {extracting ? t('extracting') : `📷 ${t('photoExtract')}`}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleMenuPhoto}
            />
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
