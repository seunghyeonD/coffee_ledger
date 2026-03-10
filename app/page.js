'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import LoginPage from '@/components/LoginPage';
import CompanySelectPage from '@/components/CompanySelectPage';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Members from '@/components/Members';
import Shops from '@/components/Shops';
import History from '@/components/History';
import Summary from '@/components/Summary';
import Toast from '@/components/Toast';

export default function Home() {
  const { user, company, loading: authLoading } = useAuth();
  const { loaded, init, reset } = useStore();
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [error, setError] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // 기업 선택 시 데이터 로드
  useEffect(() => {
    if (company) {
      setError(null);
      init(company.id).catch(e => setError(e.message || 'Supabase 연결 실패'));
    } else {
      reset();
    }
  }, [company, init, reset]);

  // 로딩 중
  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="coffee-loader">
          <div className="coffee-cup">
            <div className="coffee-liquid"></div>
            <div className="coffee-steam">
              <span></span><span></span><span></span>
            </div>
          </div>
          <p>커피 준비 중...</p>
        </div>
      </div>
    );
  }

  // 미로그인
  if (!user) return <LoginPage />;

  // 기업 미선택
  if (!company) return <CompanySelectPage />;

  // 데이터 에러
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

  // 데이터 로딩 중
  if (!loaded) {
    return (
      <div className="auth-page">
        <div className="coffee-loader">
          <div className="coffee-cup">
            <div className="coffee-liquid"></div>
            <div className="coffee-steam">
              <span></span><span></span><span></span>
            </div>
          </div>
          <p>데이터를 불러오는 중...</p>
        </div>
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
