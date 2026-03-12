'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

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

  // 회원가입 완료
  if (signUpDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
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
    );
  }

  // 재설정 메일 발송 완료
  if (resetDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
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
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
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
  );
}
