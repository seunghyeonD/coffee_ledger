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
  const { signIn, signUp, verifyOtp, resetPassword } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1); // 1: form, 2: OTP verification
  const [resetDone, setResetDone] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const nextBanner = useCallback(() => {
    setBannerIdx(prev => (prev + 1) % BANNERS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextBanner, 4000);
    return () => clearInterval(timer);
  }, [nextBanner]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSignUpStep(1);
    setOtpCode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Login
    if (mode === 'login') {
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return;
      }
      setLoading(true);
      try {
        await signIn(email, password);
      } catch (err) {
        const msg = err.message || '오류가 발생했습니다.';
        if (msg.includes('Invalid login')) setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        else setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Forgot password
    if (mode === 'forgot') {
      setLoading(true);
      try {
        await resetPassword(email);
        setResetDone(true);
      } catch (err) {
        setError(err.message || '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Signup Step 1: Send OTP
    if (mode === 'signup' && signUpStep === 1) {
      if (!name.trim()) {
        setError('이름을 입력해주세요.');
        return;
      }
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return;
      }
      if (password !== confirmPw) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!agreeTerms || !agreePrivacy) {
        setError('약관에 모두 동의해주세요.');
        return;
      }

      setLoading(true);
      try {
        await signUp(email, password, name.trim());
        setSignUpStep(2);
        setResendTimer(60);
      } catch (err) {
        const msg = err.message || '오류가 발생했습니다.';
        if (msg.includes('already registered')) setError('이미 가입된 이메일입니다.');
        else if (msg.includes('rate limit')) setError('이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
        else setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Signup Step 2: Verify OTP
    if (mode === 'signup' && signUpStep === 2) {
      if (otpCode.length !== 8) {
        setError('인증코드 8자리를 입력해주세요.');
        return;
      }
      setLoading(true);
      try {
        await verifyOtp(email, otpCode);
      } catch (err) {
        setError('인증코드가 올바르지 않습니다. 다시 확인해주세요.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, name.trim());
      setResendTimer(60);
      setError('');
    } catch (err) {
      setError('인증코드 재발송에 실패했습니다.');
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
          {mode === 'signup'
            ? (signUpStep === 2 ? '이메일 인증' : '회원가입')
            : mode === 'forgot' ? '비밀번호 재설정' : '로그인'}
        </h2>

        {mode === 'forgot' && (
          <p className="auth-subtitle">
            가입한 이메일 주소를 입력하면<br />재설정 링크를 보내드립니다.
          </p>
        )}

        {mode === 'signup' && signUpStep === 2 && (
          <p className="auth-subtitle">
            <strong>{email}</strong> 주소로<br />인증코드를 보냈습니다.
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Signup Step 2: OTP input */}
          {mode === 'signup' && signUpStep === 2 ? (
            <>
              <div className="form-group">
                <label>인증코드</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="8자리 숫자 입력"
                  maxLength={8}
                  inputMode="numeric"
                  autoFocus
                  required
                  className="otp-input"
                />
              </div>
              <div className="auth-resend">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="auth-resend-btn"
                >
                  {resendTimer > 0 ? `재발송 (${resendTimer}초)` : '인증코드 재발송'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Signup Step 1 / Login / Forgot */}
              {mode === 'signup' && (
                <div className="form-group">
                  <label>이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    required
                  />
                </div>
              )}
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
                  <div className="auth-terms">
                    <label className="auth-terms-item">
                      <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                      <span><button type="button" className="auth-terms-link" onClick={() => setShowTerms('terms')}>서비스 이용약관</button>에 동의합니다. (필수)</span>
                    </label>
                    <label className="auth-terms-item">
                      <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)} />
                      <span><button type="button" className="auth-terms-link" onClick={() => setShowTerms('privacy')}>개인정보 처리방침</button>에 동의합니다. (필수)</span>
                    </label>
                    <label className="auth-terms-item auth-terms-all">
                      <input
                        type="checkbox"
                        checked={agreeTerms && agreePrivacy}
                        onChange={e => { setAgreeTerms(e.target.checked); setAgreePrivacy(e.target.checked); }}
                      />
                      <span>전체 동의</span>
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading
              ? '처리중...'
              : mode === 'signup'
                ? (signUpStep === 2 ? '인증 완료' : '인증코드 발송')
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

      {showTerms && (
        <div className="auth-terms-overlay" onClick={() => setShowTerms(null)}>
          <div className="auth-terms-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-terms-modal-header">
              <h3>{showTerms === 'terms' ? '서비스 이용약관' : '개인정보 처리방침'}</h3>
              <button onClick={() => setShowTerms(null)}>&times;</button>
            </div>
            <div className="auth-terms-modal-body">
              {showTerms === 'terms' ? (
                <>
                  <h4>제1조 (목적)</h4>
                  <p>이 약관은 커피 대장부(이하 "서비스")가 제공하는 서비스의 이용에 관한 조건과 절차, 권리, 의무 및 기타 필요한 사항을 규정합니다.</p>

                  <h4>제2조 (정의)</h4>
                  <p>"서비스"란 사내 커피 비용을 관리하기 위한 웹 애플리케이션을 의미합니다. "회원"이란 본 약관에 동의하고 서비스에 가입한 자를 말합니다.</p>

                  <h4>제3조 (약관의 효력)</h4>
                  <p>본 약관은 서비스를 이용하고자 하는 모든 회원에게 적용됩니다. 약관의 내용은 서비스 내 공지사항을 통해 변경될 수 있으며, 변경된 약관은 공지 후 효력이 발생합니다.</p>

                  <h4>제4조 (회원가입 및 탈퇴)</h4>
                  <p>회원가입은 이메일 인증을 통해 완료됩니다. 회원은 언제든 탈퇴를 요청할 수 있으며, 탈퇴 시 관련 데이터는 삭제됩니다.</p>

                  <h4>제5조 (서비스 이용)</h4>
                  <p>서비스는 사내 커피 비용 관리 목적으로만 사용해야 합니다. 서비스를 부정한 목적으로 이용하는 경우 이용이 제한될 수 있습니다.</p>

                  <h4>제6조 (면책)</h4>
                  <p>서비스는 무료로 제공되며, 서비스 이용으로 인해 발생하는 손해에 대해 법적 책임을 지지 않습니다. 서비스의 중단, 변경, 종료에 대해 사전 고지할 수 있습니다.</p>
                </>
              ) : (
                <>
                  <h4>1. 수집하는 개인정보</h4>
                  <p>서비스는 회원가입 및 서비스 이용을 위해 다음 정보를 수집합니다: 이메일 주소, 이름, 비밀번호(암호화 저장).</p>

                  <h4>2. 개인정보의 이용 목적</h4>
                  <p>수집된 개인정보는 다음 목적으로 이용됩니다: 회원 식별 및 인증, 서비스 제공, 공지사항 전달, 푸시 알림 발송.</p>

                  <h4>3. 개인정보의 보유 및 파기</h4>
                  <p>회원 탈퇴 시 수집된 개인정보는 즉시 파기됩니다. 다만, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>

                  <h4>4. 개인정보의 제3자 제공</h4>
                  <p>서비스는 회원의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의한 요청이 있는 경우 예외로 합니다.</p>

                  <h4>5. 개인정보의 안전성 확보</h4>
                  <p>비밀번호는 암호화하여 저장되며, 개인정보 접근 권한을 최소화하고 있습니다. 데이터는 SSL/TLS를 통해 암호화 전송됩니다.</p>

                  <h4>6. 쿠키 및 알림</h4>
                  <p>서비스는 로그인 세션 유지를 위해 쿠키를 사용합니다. 푸시 알림은 회원의 별도 동의 하에 발송됩니다.</p>
                </>
              )}
            </div>
            <div className="auth-terms-modal-footer">
              <button className="btn btn-primary" onClick={() => setShowTerms(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
