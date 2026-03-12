'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/roles';

export default function CompanySelectPage() {
  const { userCompanies, selectCompany, createCompany, joinCompany, signOut } = useAuth();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createCompany(name.trim());
    } catch (err) {
      setError(err.message || '기업 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await joinCompany(inviteCode.trim());
    } catch (err) {
      setError(err.message || '기업 참여에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetMode = () => {
    setMode(null);
    setError('');
    setName('');
    setInviteCode('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card company-select-card">
        <div className="auth-logo">{'\u2615'} 커피 대장부</div>
        <h2 className="auth-title">기업 선택</h2>
        <p className="auth-subtitle">관리할 기업을 선택하거나 새로 만드세요.</p>

        {userCompanies.length > 0 && (
          <div className="company-list">
            {userCompanies.map(c => (
              <button
                key={c.id}
                className="company-item"
                onClick={() => selectCompany(c)}
              >
                <div className="company-item-name">{c.name}</div>
                <div className="company-item-role">
                  {ROLE_LABELS[c.role] || c.role}
                </div>
              </button>
            ))}
          </div>
        )}

        {mode === null && (
          <div className="company-actions">
            <button
              className="btn btn-primary auth-btn"
              onClick={() => setMode('join')}
            >
              초대 코드로 참여
            </button>
            <button
              className="btn auth-btn"
              onClick={() => setMode('create')}
            >
              + 새 기업 만들기
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="company-create-form">
            <div className="form-group">
              <label>초대 코드</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="예: ABC123"
                required
                autoFocus
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={resetMode}>취소</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '참여중...' : '참여하기'}
              </button>
            </div>
          </form>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="company-create-form">
            <div className="form-group">
              <label>기업 이름</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 우리회사"
                required
                autoFocus
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={resetMode}>취소</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '생성중...' : '만들기'}
              </button>
            </div>
          </form>
        )}

        <button className="auth-logout-btn" onClick={signOut}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
