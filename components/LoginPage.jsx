'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common', 'legal']);
  const { signIn, signUp, verifyOtp, resetPassword } = useAuth();

  const BANNERS = [
    { text: t('heroTitle'), sub: t('feature1Title'), bg: 'linear-gradient(135deg, #3a2a1a 0%, #5c4033 100%)' },
    { text: t('feature2Title'), sub: t('feature2Desc'), bg: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)' },
    { text: t('feature3Title'), sub: t('feature3Desc'), bg: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' },
    { text: t('feature4Title'), sub: t('feature4Desc'), bg: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' },
  ];

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

  const bannerCarousel = (
    <div className="auth-banner">
      <div className="auth-banner-slide" style={{ background: BANNERS[bannerIdx].bg }} key={bannerIdx}>
        <div className="auth-banner-text">{BANNERS[bannerIdx].text}</div>
        <div className="auth-banner-sub">{BANNERS[bannerIdx].sub}</div>
      </div>
      <div className="auth-banner-dots">
        {BANNERS.map((_, i) => (
          <button key={i} className={`auth-banner-dot ${i === bannerIdx ? 'active' : ''}`} onClick={() => setBannerIdx(i)} />
        ))}
      </div>
    </div>
  );

  if (resetDone) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          {bannerCarousel}
          <div className="auth-card-body">
          <div className="auth-logo">{'\u2615'} {t('common:appName')}</div>
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
        {bannerCarousel}
        <div className="auth-card-body">
        <div className="auth-logo">{'\u2615'} {t('common:appName')}</div>
        <h2 className="auth-title">
          {mode === 'signup'
            ? (signUpStep === 2 ? t('emailVerification') : t('signup'))
            : mode === 'forgot' ? t('resetPassword') : t('login')}
        </h2>

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

        {mode === 'login' && (
          <button className="auth-forgot-btn" onClick={() => switchMode('forgot')}>
            {t('forgotPassword')}
          </button>
        )}

        <div className="auth-switch">
          {mode === 'signup' ? (
            <span>{t('alreadyHaveAccount')} <button onClick={() => switchMode('login')}>{t('login')}</button></span>
          ) : mode === 'forgot' ? (
            <span>{t('rememberPassword')} <button onClick={() => switchMode('login')}>{t('login')}</button></span>
          ) : (
            <span>{t('noAccount')} <button onClick={() => switchMode('signup')}>{t('signup')}</button></span>
          )}
        </div>
        </div>
      </div>

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
                  {[1,2,3,4,5,6].map(n => (
                    <div key={n}>
                      <h4>{t(`legal:terms.article${n}Title`)}</h4>
                      <p>{t(`legal:terms.article${n}Content`)}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[1,2,3,4,5,6].map(n => (
                    <div key={n}>
                      <h4>{t(`legal:privacy.article${n}Title`)}</h4>
                      <p>{t(`legal:privacy.article${n}Content`)}</p>
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
