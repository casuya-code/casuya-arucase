import { useState, useId, useEffect, useRef, useCallback } from 'react';
import { loadFontAwesome } from '../../utils/loadFontAwesome';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { useSound } from '../../utils/useSound';
import { publicAPI } from '../../services/public';
import api from '../../services/api';
import { resolveStaticUrl } from '../../utils/backendUrl';
import KeyringIcon from '../../components/icons/KeyringIcon';
import './Login.css';

const DEFAULT_LOGO = '/uploads/photos/9749b4af-7e1c-454b-a482-37a0f64162f1.jpg';
const MAX_USERNAME_LEN = 64;
const MAX_PASSWORD_LEN = 128;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lockoutTimerRef = useRef(null);
  const formId = useId();
  const errorId = `${formId}-error`;
  const titleId = `${formId}-title`;
  const { login } = useAuth();
  const navigate = useNavigate();
  const { playLogin } = useSound();

  useEffect(() => {
    loadFontAwesome().catch(() => {});
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
      return;
    }
    lockoutTimerRef.current = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(lockoutTimerRef.current);
          setRateLimitInfo(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [lockoutSeconds]);

  const formatLockoutTime = useCallback((secs) => {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return m > 0 ? `${h} saa ${m} dakika` : `${h} saa`;
    }
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return s > 0 ? `${m} dakika ${s} sekundi` : `${m} dakika`;
    }
    return `${secs} sekundi`;
  }, []);

  /** Already signed in — skip showing the form again. */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        if (res?.data?.user) navigate('/admin', { replace: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data;
      } catch {
        return { settings: {} };
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const logoUrl = resolveStaticUrl(
    homepageData?.settings?.school_logo || DEFAULT_LOGO
  );

  const reportError = (msg) => {
    setFormError(msg);
    toast.error(msg);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = username.trim();
    const pass = password;
    if (!user || !pass) {
      reportError('Andika jina la mtumiaji na nenosiri.');
      return;
    }

    if (lockoutSeconds > 0) {
      reportError(`Subiri ${formatLockoutTime(lockoutSeconds)} kabla ya kujaribu tena.`);
      return;
    }

    setFormError('');
    setRateLimitInfo(null);
    setLoading(true);
    try {
      const result = await login(user, pass);
      if (!result || typeof result !== 'object') {
        reportError('Imeshindwa kuingia. Majibu hayatarajiwi kutoka kwa seva.');
        return;
      }
      if (result.success) {
        toast.success('Umeingia kikamilifu.');
        try {
          playLogin();
        } catch {
          /* optional */
        }
        navigate('/admin');
        return;
      }

      // Parse rate limit info from the error response
      const errData = result.errorData || result;
      if (errData?.rateLimitInfo) {
        setRateLimitInfo(errData.rateLimitInfo);
      }

      // Handle 429 lockout
      if (result.isRateLimit && result.retryAfter) {
        setLockoutSeconds(result.retryAfter);
        reportError(`Kodi imefikiwa. Subiri ${formatLockoutTime(result.retryAfter)} kabla ya kujaribu tena.`);
        return;
      }

      // Show remaining attempts warning
      const rli = errData?.rateLimitInfo;
      if (rli && rli.attempts !== undefined && rli.maxAttempts) {
        const remaining = rli.maxAttempts - rli.attempts;
        if (remaining > 0 && remaining <= 3) {
          setRateLimitInfo({ ...rli, remaining });
        }
      }

      // Handle lockout from 429 in error response
      if (result.lockoutSeconds) {
        setLockoutSeconds(result.lockoutSeconds);
      }

      reportError(result.error || 'Imeshindwa kuingia. Angalia jina la mtumiaji na nenosiri kisha jaribu tena.');
    } catch (err) {
      let msg = 'Hitilafu imetokea. Tafadhali jaribu tena.';
      if (err?.response?.status === 429) {
        const retryAfter = err.response?.data?.retryAfter || err.response?.data?.remainingTime || 900;
        setLockoutSeconds(retryAfter);
        msg = `Kodi imefikiwa. Subiri ${formatLockoutTime(retryAfter)} kabla ya kujaribu tena.`;
      } else if (err?.name === 'TypeError' && String(err?.message || '').includes('fetch')) {
        msg = 'Hitilafu ya mtandao. Angalia muunganisho wako kisha jaribu tena.';
      } else if (err?.code === 'ECONNABORTED') {
        msg = 'Ombi limechelewa. Tafadhali jaribu tena.';
      } else if (err?.message) {
        msg = String(err.message);
      }
      reportError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <a href="#staff-login-main" className="login-skip-link">
        Ruka hadi fomu ya kuingia
      </a>

      <div className="login-card-stack">
        <main id="staff-login-main" className="login-container" tabIndex={-1}>
          <header className="login-header">
            <div className="login-logo-wrap">
              <img
                src={logoUrl}
                alt="Nembo ya Arusha Catholic Seminary"
                className="login-logo"
                width={88}
                height={88}
                decoding="async"
              />
            </div>
            <p className="login-eyebrow">Arusha Catholic Seminary</p>
            <h1 id={titleId}>Matumizi ya Ofisi tu.</h1>
            <div className="login-badge">
              <i className="fas fa-lock" aria-hidden="true"></i>
              <span>Staff Access Only</span>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="login-form"
            aria-labelledby={titleId}
            aria-describedby={formError ? errorId : undefined}
            noValidate
          >
            {formError ? (
              <div id={errorId} className="form-error" role="alert">
                <i className="fas fa-exclamation-circle" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            ) : null}

            {lockoutSeconds > 0 && (
              <div className="login-lockout-banner" role="alert">
                <i className="fas fa-shield-alt" aria-hidden="true" />
                <div className="login-lockout-text">
                  <span className="login-lockout-label">Uminisho wa usalama umewashwa</span>
                  <span className="login-lockout-timer">{formatLockoutTime(lockoutSeconds)}</span>
                </div>
              </div>
            )}

            {rateLimitInfo && lockoutSeconds <= 0 && rateLimitInfo.remaining !== undefined && rateLimitInfo.remaining > 0 && (
              <div className="login-attempts-warning" role="status">
                <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                <span>
                  Majaribio {rateLimitInfo.remaining} yaliyobaki kabla ya kufungwa.
                </span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">Jina la mtumiaji</label>
              <div className="input-with-icon">
                <i className="fas fa-user input-icon" aria-hidden="true" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setFormError('');
                  }}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  required
                  disabled={loading}
                  maxLength={MAX_USERNAME_LEN}
                  className="input-with-icon-field"
                  aria-invalid={Boolean(formError)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Nenosiri</label>
              <div className="input-with-icon">
                <span className="input-icon input-icon--keyring" aria-hidden="true">
                  <KeyringIcon />
                </span>
                <div className="input-field-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormError('');
                    }}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    maxLength={MAX_PASSWORD_LEN}
                    className="input-with-icon-field"
                    aria-invalid={Boolean(formError)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    <i
                      className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="login-actions">
              <button
                type="submit"
                className="login-submit"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                    <span>Inaingia…</span>
                    <span className="sr-only">Tafadhali subiri</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt" aria-hidden="true" />
                    <span>Ingia</span>
                  </>
                )}
              </button>
              <Link to="/" className="login-back-btn">
                <i className="fas fa-arrow-left" aria-hidden="true" />
                <span>Tovuti ya Umma</span>
              </Link>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Login;
