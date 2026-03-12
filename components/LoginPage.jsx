'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

const BANNERS = [
  {
    text: '사내 커피 비용, 한눈에 관리하세요',
    sub: '멤버별 잔액 추적 & 월별 리포트',
    bg: 'linear-gradient(135deg, #3a2a1a 0%, #5c4033 100%)',
  },
  {
    text: '주변 카페 검색 & 메뉴 등록',
    sub: '카카오맵 연동으로 간편하게',
    bg: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
  },
  {
    text: '엑셀 내보내기로 보고서 완성',
    sub: '클릭 한 번으로 월별 정산',
    bg: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
  },
  {
    text: '실시간 푸시 알림',
    sub: '주문 등록 & 잔액 부족 알림',
    bg: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
  },
];

export default function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);

  const nextBanner = useCallback(() => {
    setBannerIdx(prev => (prev + 1) % BANNERS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextBanner, 4000);
    return () => clearInterval(timer);
  }, [nextBanner]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPw) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (mode !== 'forgot' && password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (mode === 'signup' && inviteCode !== process.env.NEXT_PUBLIC_INVITE_CODE) {
      setError('승인코드가 올바르지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSignUpDone(true);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setResetDone(true);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      const msg = err.message || '오류가 발생했습니다.';
      if (msg.includes('Invalid login')) setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (msg.includes('already registered')) setError('이미 가입된 이메일입니다.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const bannerCarousel = (
    <div className="auth-banner">
      <div
        className="auth-banner-slide"
        style={{ background: BANNERS[bannerIdx].bg }}
        key={bannerIdx}
      >
        <div className="auth-banner-text">{BANNERS[bannerIdx].text}</div>
        <div className="auth-banner-sub">{BANNERS[bannerIdx].sub}</div>
      </div>
      <div className="auth-banner-dots">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            className={`auth-banner-dot ${i === bannerIdx ? 'active' : ''}`}
            onClick={() => setBannerIdx(i)}
          />
        ))}
      </div>
    </div>
  );

  // 회원가입 완료
  if (signUpDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          {bannerCarousel}
          <div className="auth-card-body">
          <div className="auth-logo">{'\u2615'} 커피 대장부</div>
          <div className="auth-success">
            <h3>가입 완료!</h3>
            <p>이메일 인증 후 로그인해주세요.</p>
            <button className="btn btn-primary auth-btn" onClick={() => { switchMode('login'); setSignUpDone(false); }}>
              로그인하기
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // 재설정 메일 발송 완료
  if (resetDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          {bannerCarousel}
          <div className="auth-card-body">
          <div className="auth-logo">{'\u2615'} 커피 대장부</div>
          <div className="auth-success">
            <h3>메일을 확인해주세요</h3>
            <p><strong>{email}</strong> 주소로<br />비밀번호 재설정 링크를 보냈습니다.</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              메일이 보이지 않으면 스팸함을 확인해주세요.
            </p>
            <button className="btn btn-primary auth-btn" onClick={() => { switchMode('login'); setResetDone(false); }}>
              로그인으로 돌아가기
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {bannerCarousel}
        <div className="auth-card-body">
        <div className="auth-logo">{'\u2615'} 커피 대장부</div>
        <h2 className="auth-title">
          {mode === 'signup' ? '회원가입' : mode === 'forgot' ? '비밀번호 재설정' : '로그인'}
        </h2>

        {mode === 'forgot' && (
          <p className="auth-subtitle">
            가입한 이메일 주소를 입력하면<br />재설정 링크를 보내드립니다.
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6자 이상"
                required
              />
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label>비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="비밀번호 재입력"
                  required
                />
              </div>
              <div className="form-group">
                <label>승인코드</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="승인코드를 입력하세요"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading
              ? '처리중...'
              : mode === 'signup'
                ? '가입하기'
                : mode === 'forgot'
                  ? '재설정 링크 보내기'
                  : '로그인'}
          </button>
        </form>

        {mode === 'login' && (
          <button className="auth-forgot-btn" onClick={() => switchMode('forgot')}>
            비밀번호를 잊어버리셨나요?
          </button>
        )}

        <div className="auth-switch">
          {mode === 'signup' ? (
            <span>이미 계정이 있나요? <button onClick={() => switchMode('login')}>로그인</button></span>
          ) : mode === 'forgot' ? (
            <span>비밀번호가 기억나셨나요? <button onClick={() => switchMode('login')}>로그인</button></span>
          ) : (
            <span>계정이 없나요? <button onClick={() => switchMode('signup')}>회원가입</button></span>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
