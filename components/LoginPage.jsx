'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSignUp && password !== confirmPw) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        setSignUpDone(true);
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

  if (signUpDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">{'\u2615'} 커피 대장부</div>
          <div className="auth-success">
            <h3>가입 완료!</h3>
            <p>이메일 인증 후 로그인해주세요.</p>
            <button className="btn btn-primary auth-btn" onClick={() => { setIsSignUp(false); setSignUpDone(false); }}>
              로그인하기
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
        <h2 className="auth-title">{isSignUp ? '회원가입' : '로그인'}</h2>

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
          {isSignUp && (
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
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading ? '처리중...' : (isSignUp ? '가입하기' : '로그인')}
          </button>
        </form>

        <div className="auth-switch">
          {isSignUp ? (
            <span>이미 계정이 있나요? <button onClick={() => { setIsSignUp(false); setError(''); }}>로그인</button></span>
          ) : (
            <span>계정이 없나요? <button onClick={() => { setIsSignUp(true); setError(''); }}>회원가입</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
