'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Members from '@/components/Members';
import Shops from '@/components/Shops';
import History from '@/components/History';
import Summary from '@/components/Summary';
import Toast from '@/components/Toast';

export default function Home() {
  const { loaded, init } = useStore();
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [error, setError] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    init().catch(e => setError(e.message || 'Supabase 연결 실패'));
  }, [init]);

  if (error) {
    return (
      <div className="app-layout">
        <div className="loading-screen">
          <div style={{ textAlign: 'center' }}>
            <h2>데이터 로드 실패</h2>
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Supabase 연결을 확인해주세요.</p>
            <p style={{ marginTop: 8, color: 'var(--danger)', fontSize: 13 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="app-layout">
        <div className="loading-screen">데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} showToast={showToast} />
      <main className="main-content">
        {page === 'dashboard' && <Dashboard showToast={showToast} />}
        {page === 'members' && <Members showToast={showToast} />}
        {page === 'shops' && <Shops showToast={showToast} />}
        {page === 'history' && <History showToast={showToast} />}
        {page === 'summary' && <Summary />}
      </main>
      <Toast message={toast} />
    </div>
  );
}
