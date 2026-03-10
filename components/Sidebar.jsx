'use client';

import { useStore } from '@/lib/store';
import { formatMoney, formatDate, getWeeksInMonth, DAY_NAMES } from '@/lib/utils';

const NAV_ITEMS = [
  { key: 'dashboard', icon: '\u{1F4C5}', label: '대시보드', mobileLabel: '홈' },
  { key: 'members', icon: '\u{1F465}', label: '멤버 관리', mobileLabel: '멤버' },
  { key: 'shops', icon: '\u{1F37A}', label: '메뉴 관리', mobileLabel: '메뉴' },
  { key: 'history', icon: '\u{1F4CB}', label: '주문 내역', mobileLabel: '내역' },
  { key: 'summary', icon: '\u{1F4CA}', label: '월별 요약', mobileLabel: '요약' },
];

export default function Sidebar({ page, setPage, showToast }) {
  const store = useStore();

  const handleExport = () => {
    import('@/lib/exportExcel').then(mod => {
      mod.exportExcel(store, showToast);
    });
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span>{'\u2615'}</span>
        <span className="logo-text">커피 대장부</span>
      </div>
      <ul className="nav-menu">
        {NAV_ITEMS.map(item => (
          <li key={item.key}>
            <button
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-label-mobile">{item.mobileLabel}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <button className="btn-export" onClick={handleExport}>
          {'\u{1F4E5}'} 엑셀 내보내기
        </button>
      </div>
    </nav>
  );
}
