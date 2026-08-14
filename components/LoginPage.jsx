'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';

const IconUser = () => (
  <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLock = () => (
  <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEye = ({ off }) => off ? (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
) : (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common', 'legal']);
  const { signIn, signUp, verifyOtp, resetPassword } = useAuth();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1);
  const [resetDone, setResetDone] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);

  // 아이디 저장: 저장된 이메일이 있으면 자동 입력
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedEmail');
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const tm = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(tm);
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

    if (mode === 'login') {
      if (password.length < 6) { setError(t('passwordMinLength')); return; }
      setLoading(true);
      try {
        await signIn(email, password);
        try {
          if (remember) localStorage.setItem('savedEmail', email);
          else localStorage.removeItem('savedEmail');
        } catch {}
      } catch (err) {
        const msg = err.message || t('genericError');
        if (msg.includes('Invalid login')) setError(t('invalidCredentials'));
        else setError(msg);
      } finally { setLoading(false); }
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await resetPassword(email);
        setResetDone(true);
      } catch (err) {
        setError(err.message || t('genericError'));
      } finally { setLoading(false); }
      return;
    }

    if (mode === 'signup' && signUpStep === 1) {
      if (!name.trim()) { setError(t('nameRequired')); return; }
      if (password.length < 6) { setError(t('passwordMinLength')); return; }
      if (password !== confirmPw) { setError(t('passwordMismatch')); return; }
      if (!agreeTerms || !agreePrivacy) { setError(t('agreeTerms')); return; }

      setLoading(true);
      try {
        await signUp(email, password, name.trim());
        setSignUpStep(2);
        setResendTimer(60);
      } catch (err) {
        const msg = err.message || t('genericError');
        if (msg.includes('already registered')) setError(t('emailAlreadyExists'));
        else if (msg.includes('rate limit')) setError(t('rateLimitExceeded'));
        else setError(msg);
      } finally { setLoading(false); }
      return;
    }

    if (mode === 'signup' && signUpStep === 2) {
      if (otpCode.length !== 8) { setError(t('verifyCodeRequired')); return; }
      setLoading(true);
      try {
        await verifyOtp(email, otpCode);
      } catch (err) {
        setError(t('verifyCodeInvalid'));
      } finally { setLoading(false); }
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
      setError(t('resendFailed'));
    } finally { setLoading(false); }
  };

  if (resetDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card-body">
          <div className="auth-logo"><span className="auth-logo-mark">{'\u2615'}</span><span>{t('common:appName')}</span></div>
          <div className="auth-success">
            <h3>{t('checkEmail')}</h3>
            <p><strong>{email}</strong> {t('resetLinkSent').split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              {t('checkSpam')}
            </p>
            <button className="btn btn-primary auth-btn" onClick={() => { switchMode('login'); setResetDone(false); }}>
              {t('backToLogin')}
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
        <div className="auth-card-body">
        {mode === 'login' ? (
          <img src="/login-logo.png" alt={t('common:appName')} className="auth-logo-img" />
        ) : (
          <>
            <div className="auth-logo"><span className="auth-logo-mark">{'\u2615'}</span><span>{t('common:appName')}</span></div>
            <h2 className="auth-title">
              {mode === 'signup'
                ? (signUpStep === 2 ? t('emailVerification') : t('signup'))
                : t('resetPassword')}
            </h2>
          </>
        )}

        {mode === 'forgot' && (
          <p className="auth-subtitle" style={{ whiteSpace: 'pre-line' }}>
            {t('resetPasswordDesc')}
          </p>
        )}

        {mode === 'signup' && signUpStep === 2 && (
          <p className="auth-subtitle" style={{ whiteSpace: 'pre-line' }}>
            {t('verifyEmailSent', { email })}
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && signUpStep === 2 ? (
            <>
              <div className="form-group">
                <label>{t('verifyCode')}</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder={t('verifyCodePlaceholder')}
                  maxLength={8}
                  inputMode="numeric"
                  autoFocus
                  required
                  className="otp-input"
                />
              </div>
              <div className="auth-resend">
                <button type="button" onClick={handleResendOtp} disabled={resendTimer > 0 || loading} className="auth-resend-btn">
                  {resendTimer > 0 ? t('resendTimer', { seconds: resendTimer }) : t('resendCode')}
                </button>
              </div>
            </>
          ) : mode === 'login' ? (
            <>
              <div className="auth-input">
                <IconUser />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('email')} required />
              </div>
              <div className="auth-input">
                <IconLock />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('password')}
                  required
                />
                <button type="button" className="auth-eye" onClick={() => setShowPw(!showPw)} aria-label={t('password')}>
                  <IconEye off={showPw} />
                </button>
              </div>
              <div className="auth-row">
                <label className="auth-remember">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  {t('rememberEmail')}
                </label>
                <button type="button" className="auth-find-pw" onClick={() => switchMode('forgot')}>
                  {t('findPassword')}
                </button>
              </div>
            </>
          ) : (
            <>
              {mode === 'signup' && (
                <div className="form-group">
                  <label>{t('name')}</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('namePlaceholder')} required />
                </div>
              )}
              <div className="form-group">
                <label>{t('email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
              </div>

              {mode !== 'forgot' && (
                <div className="form-group">
                  <label>{t('password')}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('passwordPlaceholder')} required />
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div className="form-group">
                    <label>{t('passwordConfirm')}</label>
                    <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t('passwordConfirmPlaceholder')} required />
                  </div>
                  <div className="auth-terms">
                    <label className="auth-terms-item">
                      <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                      <span><button type="button" className="auth-terms-link" onClick={() => setShowTerms('terms')}>{t('termsOfService')}</button>{t('agreeToTerms')}</span>
                    </label>
                    <label className="auth-terms-item">
                      <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)} />
                      <span><button type="button" className="auth-terms-link" onClick={() => setShowTerms('privacy')}>{t('privacyPolicy')}</button>{t('agreeToTerms')}</span>
                    </label>
                    <label className="auth-terms-item auth-terms-all">
                      <input type="checkbox" checked={agreeTerms && agreePrivacy} onChange={e => { setAgreeTerms(e.target.checked); setAgreePrivacy(e.target.checked); }} />
                      <span>{t('agreeAll')}</span>
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading
              ? t('common:processing')
              : mode === 'signup'
                ? (signUpStep === 2 ? t('verifyComplete') : t('sendVerifyCode'))
                : mode === 'forgot'
                  ? t('sendResetLink')
                  : t('login')}
          </button>
        </form>

        {mode === 'login' ? (
          <>
            <div className="auth-divider"><span>{t('or')}</span></div>
            <button type="button" className="auth-outline-btn" onClick={() => switchMode('signup')}>
              {t('signup')}
            </button>
          </>
        ) : (
          <div className="auth-switch">
            {mode === 'signup' ? (
              <span>{t('alreadyHaveAccount')} <button onClick={() => switchMode('login')}>{t('login')}</button></span>
            ) : (
              <span>{t('rememberPassword')} <button onClick={() => switchMode('login')}>{t('login')}</button></span>
            )}
          </div>
        )}
        </div>
      </div>

      <p className="auth-copyright">© 2026 {t('common:appName')}. All rights reserved.</p>

      {showTerms && (
        <div className="auth-terms-overlay" onClick={() => setShowTerms(null)}>
          <div className="auth-terms-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-terms-modal-header">
              <h3>{showTerms === 'terms' ? t('legal:termsTitle') : t('legal:privacyTitle')}</h3>
              <button onClick={() => setShowTerms(null)}>&times;</button>
            </div>
            <div className="auth-terms-modal-body">
              {showTerms === 'terms' ? (
                <>
                  {Array.from({ length: Number(t('legal:terms.articleCount')) || 6 }, (_, i) => i + 1).map(n => (
                    <div key={n}>
                      <h4>{t(`legal:terms.article${n}Title`)}</h4>
                      <p style={{ whiteSpace: 'pre-line' }}>{t(`legal:terms.article${n}Content`)}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {Array.from({ length: Number(t('legal:privacy.articleCount')) || 6 }, (_, i) => i + 1).map(n => (
                    <div key={n}>
                      <h4>{t(`legal:privacy.article${n}Title`)}</h4>
                      <p style={{ whiteSpace: 'pre-line' }}>{t(`legal:privacy.article${n}Content`)}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="auth-terms-modal-footer">
              <button className="btn btn-primary" onClick={() => setShowTerms(null)}>{t('common:close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
