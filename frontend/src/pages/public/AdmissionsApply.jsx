import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../../utils/toast';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicAPI } from '../../services/public';
import './AdmissionsApply.css';

const APPLY_HERO_LEAD =
  'Jisajili kwa kutumia barua pepe na namba ya simu, kisha tunza neno lako la siri kwa usalama. Baada ya kujisajili, bonyeza "Ingia" ili kujaza na kutuma fomu ya maombi. Fuatilia akaunti yako mara kwa mara kuona majibu na maelekezo yatakayotolewa na Ofisi ya Udahili.';

const EDUCATION_OTHER = 'OTHER';

const EDUCATION_LABELS = {
  CLASS_6_7: 'Darasa la 6/7',
  FORM_IV: 'Kidato cha Nne',
  OTHER: 'Nyingine',
  PRIMARY: 'Msingi',
  FORM_VI: 'Kidato cha Sita',
};

function validateApplicationForm(form) {
  const errors = [];
  if (!form.education_level) {
    errors.push({ field: 'education_level', message: 'Chagua kiwango cha elimu ulichomaliza.' });
  }
  if (!form.desired_entry?.trim()) {
    errors.push({ field: 'desired_entry', message: 'Andika kidato au darasa unaloomba kujiunga.' });
  }
  if (form.education_level === EDUCATION_OTHER && !form.previous_school?.trim()) {
    errors.push({
      field: 'previous_school',
      message: 'Umechagua Nyingine — andika jina la shule uliyotoka.',
    });
  }
  if (!form.region?.trim()) {
    errors.push({ field: 'region', message: 'Andika mkoa wako.' });
  }
  if (!form.district?.trim()) {
    errors.push({ field: 'district', message: 'Andika wilaya yako.' });
  }
  if (!form.message?.trim()) {
    errors.push({ field: 'message', message: 'Andika ujumbe au maelezo ya ziada.' });
  }
  return { valid: errors.length === 0, errors };
}

/** System labels + applicant values for the confirmation step */
function buildSubmitSummaryItems(form) {
  const items = [
    {
      label: 'Elimu uliyomaliza',
      value: EDUCATION_LABELS[form.education_level] || form.education_level,
    },
    {
      label: 'Kidato au darasa unaloomba kujiunga',
      value: form.desired_entry.trim(),
    },
  ];
  if (form.education_level === EDUCATION_OTHER) {
    if (form.is_transfer) {
      items.push({
        label: 'Aina ya ombi',
        value: 'Ninaomba kuhamia kutoka shule nyingine',
      });
    }
    if (form.previous_school?.trim()) {
      items.push({ label: 'Shule uliyotoka', value: form.previous_school.trim() });
    }
  }
  items.push(
    { label: 'Mkoa', value: form.region.trim() },
    { label: 'Wilaya', value: form.district.trim() },
    { label: 'Ujumbe wa mwombaji', value: form.message.trim() }
  );
  return items;
}

function buildSuccessMessage(form) {
  const parts = [
    `elimu (${EDUCATION_LABELS[form.education_level] || form.education_level})`,
    `ombi la kujiunga ${form.desired_entry.trim()}`,
    `mkoa ${form.region.trim()}`,
    `wilaya ${form.district.trim()}`,
    'ujumbe wako',
  ];
  if (form.education_level === EDUCATION_OTHER && form.is_transfer) {
    parts.splice(2, 0, 'ombi la uhamisho');
  }

  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} na ${parts[parts.length - 1]}`;

  return `Maombi yako yamewasilishwa kwa Ofisi ya Udahili. Tumepokea ${list}. Fomu imefungwa kwa sasa — subiri majibu hapa.`;
}

const LS_TOKEN = 'applicant_token';
const LS_USER = 'applicant_user';
const LS_ELIGIBILITY_PREFIX = 'applicant_eligibility_';

function getApplicantToken() {
  return localStorage.getItem(LS_TOKEN) || '';
}

function parseApplicantJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Avoid /application/mine when token is missing, malformed, or expired (prevents noisy 401s). */
function isApplicantTokenUsable(token) {
  const payload = parseApplicantJwt(token);
  if (!payload || payload.role !== 'applicant' || !payload.user_id) return false;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
  return true;
}

function setApplicantSession({ token, applicant }) {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_USER, JSON.stringify(applicant || {}));
}

function clearApplicantSession() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

function getEligibilityStorageKey() {
  const payload = parseApplicantJwt(getApplicantToken());
  return payload?.user_id ? `${LS_ELIGIBILITY_PREFIX}${payload.user_id}` : null;
}

function readEligibilityConfirmed() {
  const key = getEligibilityStorageKey();
  return key ? sessionStorage.getItem(key) === 'yes' : false;
}

function persistEligibilityConfirmed() {
  const key = getEligibilityStorageKey();
  if (key) sessionStorage.setItem(key, 'yes');
}

function clearEligibilityConfirmed() {
  const key = getEligibilityStorageKey();
  if (key) sessionStorage.removeItem(key);
}

const AdmissionsApply = () => {
  const [mode, setMode] = useState(null); // null | 'register' | 'login'
  const [loading, setLoading] = useState(false);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_USER) || 'null');
    } catch {
      return null;
    }
  });

  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [application, setApplication] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [applicationForm, setApplicationForm] = useState({
    education_level: '',
    is_transfer: false,
    previous_school: '',
    desired_entry: '',
    region: '',
    district: '',
    message: '',
  });

  const statusLabel = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'UMEKUBALIWA';
    if (s === 'rejected') return 'IMEKATALIWA';
    if (s === 'read') return 'IMESOMWA';
    return 'INASUBIRI';
  };

  const statusTone = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'status-approved';
    if (s === 'rejected') return 'status-rejected';
    if (s === 'read') return 'status-read';
    return 'status-pending';
  };

  const fetchMyApplication = async () => {
    const token = getApplicantToken();
    if (!token || !isApplicantTokenUsable(token)) {
      if (token) {
        clearApplicantSession();
        setMe(null);
      }
      return;
    }

    setApplicationLoading(true);
    try {
      const res = await publicAPI.getMyAdmissionApplication(token);
      if (res?.status === 401 || res?.status === 403) {
        clearApplicantSession();
        setMe(null);
        setApplication(null);
        return;
      }
      const app = res.data?.application || null;
      setApplication(app);
      if (app) {
        setApplicationForm((prev) => ({
          ...prev,
          education_level: app.education_level || '',
          is_transfer: Boolean(app.is_transfer),
          previous_school: app.previous_school || '',
          desired_entry: app.desired_entry || '',
          region: app.region || '',
          district: app.district || '',
          message: app.message || '',
        }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearApplicantSession();
        setMe(null);
        setApplication(null);
      }
    } finally {
      setApplicationLoading(false);
    }
  };

  useEffect(() => {
    const token = getApplicantToken();
    if (!token) {
      setEligibilityConfirmed(false);
      return;
    }
    if (!isApplicantTokenUsable(token)) {
      clearApplicantSession();
      setMe(null);
      setEligibilityConfirmed(false);
      return;
    }
    setEligibilityConfirmed(readEligibilityConfirmed());
    void fetchMyApplication().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (me && getApplicantToken() && isApplicantTokenUsable(getApplicantToken())) {
      setEligibilityConfirmed(readEligibilityConfirmed());
    }
  }, [me]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.full_name.trim()) return toast.error('Tafadhali andika majina yako kamili.');
    if (!registerForm.email.trim()) return toast.error('Tafadhali andika barua pepe.');
    if (!registerForm.phone.trim()) return toast.error('Tafadhali andika namba ya simu.');
    if (!registerForm.password) return toast.error('Tafadhali weka nenosiri.');
    if (registerForm.password.length < 6) return toast.error('Nenosiri liwe angalau herufi 6.');
    if (registerForm.password !== registerForm.confirm_password) return toast.error('Nenosiri halifanani.');

    setLoading(true);
    try {
      const res = await publicAPI.registerAdmissionApplicant({
        full_name: registerForm.full_name.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
      });
      const token = res.data?.token;
      const applicant = res.data?.applicant;
      if (!token) throw new Error('No token returned');
      setApplicantSession({ token, applicant });
      setMe(applicant);
      clearEligibilityConfirmed();
      setEligibilityConfirmed(false);
      toast.success('Akaunti imetengenezwa. Jibu swali la kustahili ili kuendelea.');
      await fetchMyApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Imeshindikana kujisajili. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.identifier.trim()) return toast.error('Andika barua pepe au namba ya simu.');
    if (!loginForm.password) return toast.error('Andika nenosiri.');

    setLoading(true);
    try {
      const res = await publicAPI.loginAdmissionApplicant({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      const token = res.data?.token;
      const applicant = res.data?.applicant;
      if (!token) throw new Error('No token returned');
      setApplicantSession({ token, applicant });
      setMe(applicant);
      clearEligibilityConfirmed();
      setEligibilityConfirmed(false);
      toast.success('Umefanikiwa kuingia. Jibu swali la kustahili ili kuendelea.');
      await fetchMyApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Imeshindikana kuingia. Hakiki taarifa zako.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = (logoutMessage) => {
    clearEligibilityConfirmed();
    clearApplicantSession();
    setMe(null);
    setApplication(null);
    setMode(null);
    setEligibilityConfirmed(false);
    setShowSubmitConfirm(false);
    if (logoutMessage) {
      toast.error(logoutMessage);
    } else {
      toast.info('Umetoka kwenye akaunti.');
    }
  };

  const handleEligibilityYes = () => {
    persistEligibilityConfirmed();
    setEligibilityConfirmed(true);
  };

  const handleEligibilityNo = () => {
    handleLogout(
      'Samahani, maombi haya yanawalenga mvulana wa Kikristo Mkatoliki. Umetolewa kwenye akaunti.'
    );
  };

  const patchApplicationForm = (patch) => {
    setApplicationForm((p) => ({ ...p, ...patch }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((key) => {
        delete next[key];
      });
      return next;
    });
  };

  const applicationStatus = (application?.status || '').toLowerCase();
  const hasApplication = Boolean(application?.id || application?.submitted_at);
  const isAwaitingResponse =
    hasApplication && (applicationStatus === 'pending' || applicationStatus === 'read');
  const isApproved = applicationStatus === 'approved';
  const isRejected = applicationStatus === 'rejected';
  const adminHasResponded =
    Boolean(application?.admin_feedback) || isApproved || isRejected;
  /** Locked while waiting on office, or after acceptance — rejected stays editable. */
  const formLocked = (isAwaitingResponse || isApproved) && !isRejected;

  const handlePrepareSubmit = (e) => {
    e.preventDefault();
    const token = getApplicantToken();
    if (!token) return toast.error('Tafadhali ingia kwanza.');

    const { valid, errors } = validateApplicationForm(applicationForm);
    if (!valid) {
      const map = {};
      errors.forEach(({ field, message }) => {
        map[field] = message;
      });
      setFieldErrors(map);
      toast.error(errors[0].message);
      return;
    }

    setFieldErrors({});
    setShowSubmitConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowSubmitConfirm(false);
  };

  const handleConfirmSubmit = async () => {
    const token = getApplicantToken();
    if (!token) return toast.error('Tafadhali ingia kwanza.');

    if (adminHasResponded && !isApproved) {
      const ok = window.confirm(
        isRejected
          ? 'Maombi yako yalikataliwa. Unataka kusahihisha taarifa na kutuma maombi mapya?'
          : 'Ofisi ya udahili tayari imejibu maombi yako ya awali. Unataka kutuma maombi mapya?'
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      const payload = {
        education_level: applicationForm.education_level,
        is_transfer: Boolean(applicationForm.is_transfer),
        previous_school: applicationForm.previous_school.trim() || null,
        desired_entry: applicationForm.desired_entry.trim(),
        region: applicationForm.region.trim(),
        district: applicationForm.district.trim(),
        message: applicationForm.message.trim(),
      };
      const res = await publicAPI.submitAdmissionApplication(token, payload);
      if (res?.status >= 400) {
        throw { response: { data: res.data, status: res.status } };
      }
      setShowSubmitConfirm(false);
      toast.success(buildSuccessMessage(applicationForm));
      await fetchMyApplication();
    } catch (err) {
      const msg = err.response?.data?.message || 'Imeshindikana kutuma maombi. Jaribu tena.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const rawToken = getApplicantToken();
  const tokenNow = rawToken && isApplicantTokenUsable(rawToken) ? rawToken : '';
  const showApplyCard = Boolean(tokenNow || mode);
  const submitSummaryItems = buildSubmitSummaryItems(applicationForm);
  const showOtherSchoolFields = applicationForm.education_level === EDUCATION_OTHER;

  return (
    <PublicLayout>
      <div className="admissions-apply-page-static">
        <div className="admissions-apply-page-static__inner">
          <header className="aa-hero">
            <div className="aa-hero__inner">
              <div className="aa-hero__text">
                <h1 className="aa-hero__title">Maombi ya Udahili</h1>
                <p className="aa-hero__lead">{APPLY_HERO_LEAD}</p>
              </div>
              <div className="aa-hero__actions">
                <Link to="/admissions" className="aa-hero__btn">
                  <i className="fas fa-arrow-left" aria-hidden />
                  Rudi Udahili
                </Link>
              </div>
            </div>
          </header>

          {!tokenNow ? (
            <div className="admissions-apply-mode-bar" role="tablist" aria-label="Chagua sajili au ingia">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                aria-controls="admissions-apply-panel"
                className={`public-cms-hero__btn admissions-apply-mode-bar__btn${mode === 'register' ? ' public-cms-hero__btn--primary' : ''}`}
                onClick={() => setMode('register')}
              >
                <i className="fas fa-user-plus" aria-hidden />
                Sajili
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                aria-controls="admissions-apply-panel"
                className={`public-cms-hero__btn admissions-apply-mode-bar__btn${mode === 'login' ? ' public-cms-hero__btn--primary' : ''}`}
                onClick={() => setMode('login')}
              >
                <i className="fas fa-sign-in-alt" aria-hidden />
                Ingia
              </button>
            </div>
          ) : (
            <div className="admissions-apply-toolbar">
              <button
                type="button"
                className="admissions-apply-toolbar__logout"
                onClick={() => handleLogout()}
                aria-label="Toka / Logout"
              >
                <i className="fas fa-sign-out-alt" aria-hidden />
                <span className="admissions-apply-toolbar__logout-text">
                  <span>Toka</span>
                  <span className="admissions-apply-toolbar__logout-sep">/</span>
                  <span>Logout</span>
                </span>
              </button>
            </div>
          )}

          {!tokenNow && !mode ? (
            <p className="admissions-apply-hint" role="status">
              Chagua <strong>Sajili</strong> au <strong>Ingia</strong> hapo juu kuendelea.
            </p>
          ) : null}

        {showApplyCard ? (
        <section
          id="admissions-apply-panel"
          className="admissions-apply-card"
          aria-label="Fomu ya maombi ya udahili"
        >
          {!tokenNow ? (
            <>
              {mode === 'register' ? (
                <form className="form admissions-apply-form" onSubmit={handleRegister}>
                  <label>
                    Majina kamili
                    <input
                      value={registerForm.full_name}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Mfano: Juma Ali Mussa"
                      autoComplete="name"
                    />
                    <small className="field-hint">Andika majina kama yalivyo kwenye vyeti/cheti.</small>
                  </label>
                  <label>
                    Barua pepe
                    <input
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="mfano: jina@mtandao.tz"
                      autoComplete="email"
                    />
                    <small className="field-hint">Tutatumia barua pepe hii kwa mawasiliano.</small>
                  </label>
                  <label>
                    Namba ya simu
                    <input
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+255..."
                      autoComplete="tel"
                      inputMode="tel"
                    />
                    <small className="field-hint">Mfano: +255712345678 (hakikisha iko sahihi).</small>
                  </label>
                  <label>
                    Nenosiri
                    <div className="input-with-action">
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                        autoComplete="new-password"
                        placeholder="Angalau herufi 6"
                      />
                      <button
                        type="button"
                        className="input-action"
                        onClick={() => setShowRegisterPassword((v) => !v)}
                        aria-label={showRegisterPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                      >
                        {showRegisterPassword ? 'FICHA' : 'ONESHA'}
                      </button>
                    </div>
                  </label>
                  <label>
                    Rudia nenosiri
                    <div className="input-with-action">
                      <input
                        type={showRegisterConfirmPassword ? 'text' : 'password'}
                        value={registerForm.confirm_password}
                        onChange={(e) => setRegisterForm((p) => ({ ...p, confirm_password: e.target.value }))}
                        autoComplete="new-password"
                        placeholder="Rudia nenosiri"
                      />
                      <button
                        type="button"
                        className="input-action"
                        onClick={() => setShowRegisterConfirmPassword((v) => !v)}
                        aria-label={showRegisterConfirmPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                      >
                        {showRegisterConfirmPassword ? 'FICHA' : 'ONESHA'}
                      </button>
                    </div>
                  </label>

                  <button className="primary" disabled={loading} type="submit">
                    {loading ? 'Inatuma...' : 'Sajili Akaunti'}
                  </button>
                  <div className="hint">
                    Tayari una akaunti? <button type="button" className="linkish" onClick={() => setMode('login')}>Ingia hapa</button>.
                  </div>
                </form>
              ) : mode === 'login' ? (
                <form className="form admissions-apply-form" onSubmit={handleLogin}>
                  <label>
                    Barua pepe au namba ya simu
                    <input
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm((p) => ({ ...p, identifier: e.target.value }))}
                      placeholder="barua pepe au namba ya simu (+255…)"
                      autoComplete="username"
                    />
                  </label>
                  <label>
                    Nenosiri
                    <div className="input-with-action">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="input-action"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        aria-label={showLoginPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                      >
                        {showLoginPassword ? 'FICHA' : 'ONESHA'}
                      </button>
                    </div>
                  </label>
                  <button className="primary" disabled={loading} type="submit">
                    {loading ? 'Inaingia...' : 'Ingia'}
                  </button>
                  <div className="hint">
                    Huna akaunti? <button type="button" className="linkish" onClick={() => setMode('register')}>Sajili hapa</button>.
                  </div>
                </form>
              ) : null}
            </>
          ) : (
            <>
              <div className="logged-in-as" role="status">
                <div className="logged-in-as__col logged-in-as__col--user">
                  <span className="logged-in-as__label">Umeingia kama</span>
                  <span className="logged-in-as__value">{me?.full_name || me?.email || 'Mwanafunzi'}</span>
                </div>
                <div className="logged-in-as__col logged-in-as__col--status">
                  <span className="logged-in-as__label">Hali ya maombi</span>
                  <span className={`logged-in-as__status status-badge ${statusTone(application?.status)}`}>
                    {statusLabel(application?.status)}
                  </span>
                </div>
              </div>

              {applicationLoading ? (
                <div className="hint">Inapakua taarifa za maombi...</div>
              ) : null}

              {!eligibilityConfirmed ? (
                <section className="admissions-apply-eligibility" aria-labelledby="eligibility-question-title">
                  <h2 id="eligibility-question-title" className="admissions-apply-card__section-title">
                    Swali la kustahili
                  </h2>
                  <p className="admissions-apply-eligibility__question">
                    Je, wewe ni <strong>mvulana</strong>, <strong>Mkristo Mkatoliki</strong>?
                  </p>
                  <p className="admissions-apply-eligibility__hint">
                    Jibu kwa uaminifu. Ukichagua <strong>Hapana</strong>, hutaendelea na maombi na utatolewa kwenye akaunti.
                  </p>
                  <div className="admissions-apply-eligibility__actions" role="group" aria-label="Jibu la kustahili">
                    <button
                      type="button"
                      className="admissions-apply-confirm__btn admissions-apply-confirm__btn--primary"
                      onClick={handleEligibilityYes}
                    >
                      Ndiyo
                    </button>
                    <button
                      type="button"
                      className="admissions-apply-confirm__btn admissions-apply-confirm__btn--secondary"
                      onClick={handleEligibilityNo}
                    >
                      Hapana
                    </button>
                  </div>
                </section>
              ) : (
                <>
              {(application?.admin_feedback || adminHasResponded) ? (
                <div
                  className={`feedback-box${
                    application?.status
                      ? ` feedback-box--${String(application.status).toLowerCase()}`
                      : ''
                  }`}
                >
                  <div className="feedback-title">Majibu kutoka ofisi ya udahili</div>
                  <div className="feedback-text">
                    <div className="feedback-status-line">
                      Hali: {statusLabel(application?.status)}
                    </div>
                    {application?.admin_feedback
                      ? application.admin_feedback
                      : 'Hakuna ujumbe uliowekwa. Subiri majibu au wasiliana na ofisi ya udahili.'}
                  </div>
                </div>
              ) : null}

              {isRejected ? (
                <div className="admissions-apply-rejected-banner" role="status">
                  <div className="admissions-apply-rejected-banner__title">
                    <i className="fas fa-info-circle" aria-hidden />
                    Maombi yako yamekataliwa
                  </div>
                  <p>
                    Unaweza kusahihisha taarifa kwenye fomu hapa chini na kubonyeza <strong>Tuma Maombi</strong>{' '}
                    ili kutuma maombi mapya.
                  </p>
                </div>
              ) : null}

              {isAwaitingResponse ? (
                <div className="admissions-apply-success-banner" role="status">
                  <div className="admissions-apply-success-banner__title">
                    <i className="fas fa-check-circle" aria-hidden />
                    Maombi Yako Yamewasilishwa Kikamilifu!
                  </div>
                  <p>
                    Fomu imefungwa kwa sasa kwa sababu Ofisi ya Udahili inakagua taarifa zako. Uhakiki
                    unatarajiwa kukamilika ndani ya wiki moja.
                  </p>
                  <p>
                    Tafadhali tembelea ukurasa huu mara kwa mara; majibu na maelekezo mapya yataonekana hapa
                    pindi ukaguzi utakapokamilika.
                  </p>
                </div>
              ) : null}

              <h2 className="admissions-apply-card__section-title">Fomu ya Maombi</h2>
              <form
                className={`form${formLocked ? ' form--locked' : ''}`}
                onSubmit={formLocked ? (e) => e.preventDefault() : handlePrepareSubmit}
                noValidate
              >
                <label className={fieldErrors.education_level ? 'form-field--error' : ''}>
                  Kiwango cha elimu ulichomaliza <span className="form-required">*</span>
                  <select
                    value={applicationForm.education_level}
                    disabled={formLocked}
                    onChange={(e) => {
                      const education_level = e.target.value;
                      if (education_level === EDUCATION_OTHER) {
                        patchApplicationForm({ education_level });
                      } else {
                        patchApplicationForm({
                          education_level,
                          is_transfer: false,
                          previous_school: '',
                        });
                      }
                    }}
                  >
                    <option value="">-- Chagua --</option>
                    <option value="CLASS_6_7">Darasa la 6/7</option>
                    <option value="FORM_IV">Kidato cha Nne</option>
                    <option value="OTHER">Nyingine</option>
                  </select>
                  <small className="field-hint">Chagua kiwango cha mwisho ulichomaliza.</small>
                  {fieldErrors.education_level ? (
                    <small className="field-error">{fieldErrors.education_level}</small>
                  ) : null}
                </label>

                {showOtherSchoolFields ? (
                  <>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={applicationForm.is_transfer}
                        disabled={formLocked}
                        onChange={(e) => patchApplicationForm({ is_transfer: e.target.checked })}
                      />
                      <span className="checkbox-row__text">Ninaomba kuhamia kutoka</span>
                    </label>

                    <label className={fieldErrors.previous_school ? 'form-field--error' : ''}>
                      Shule ya awali <span className="form-required">*</span>
                      <input
                        value={applicationForm.previous_school}
                        disabled={formLocked}
                        onChange={(e) => patchApplicationForm({ previous_school: e.target.value })}
                        placeholder="Jina la shule uliyotoka"
                      />
                      {fieldErrors.previous_school ? (
                        <small className="field-error">{fieldErrors.previous_school}</small>
                      ) : null}
                    </label>
                  </>
                ) : null}

                <label className={fieldErrors.desired_entry ? 'form-field--error' : ''}>
                  Unataka kujiunga darasa/kidato gani <span className="form-required">*</span>
                  <input
                    value={applicationForm.desired_entry}
                    disabled={formLocked}
                    onChange={(e) => patchApplicationForm({ desired_entry: e.target.value })}
                    placeholder="Mfano: Kidato cha I / Kidato cha V"
                  />
                  <small className="field-hint">Andika kidato unachoomba kuanza kusoma.</small>
                  {fieldErrors.desired_entry ? (
                    <small className="field-error">{fieldErrors.desired_entry}</small>
                  ) : null}
                </label>

                <h3 className="admissions-apply-form-section__title">
                  SEHEMU MAOMBI YANATOKEA NA UJUMBE WA MWOMBAJI
                </h3>

                <div className="admissions-apply-form-section">
                <div className="grid">
                  <label className={fieldErrors.region ? 'form-field--error' : ''}>
                    Mkoa <span className="form-required">*</span>
                    <input
                      value={applicationForm.region}
                      disabled={formLocked}
                      onChange={(e) => patchApplicationForm({ region: e.target.value })}
                      placeholder="Mfano: Arusha"
                    />
                    {fieldErrors.region ? <small className="field-error">{fieldErrors.region}</small> : null}
                  </label>
                  <label className={fieldErrors.district ? 'form-field--error' : ''}>
                    Wilaya <span className="form-required">*</span>
                    <input
                      value={applicationForm.district}
                      disabled={formLocked}
                      onChange={(e) => patchApplicationForm({ district: e.target.value })}
                      placeholder="Mfano: Arumeru"
                    />
                    {fieldErrors.district ? <small className="field-error">{fieldErrors.district}</small> : null}
                  </label>
                </div>

                <label className={fieldErrors.message ? 'form-field--error' : ''}>
                  Ujumbe / Maelezo ya ziada <span className="form-required">*</span>
                  <textarea
                    rows={4}
                    value={applicationForm.message}
                    disabled={formLocked}
                    onChange={(e) => patchApplicationForm({ message: e.target.value })}
                    placeholder="Andika maelezo muhimu (mfano: sababu ya kuhamia, namba ya mtihani, n.k.)"
                  />
                  {fieldErrors.message ? <small className="field-error">{fieldErrors.message}</small> : null}
                </label>
                </div>

                {showSubmitConfirm && !formLocked ? (
                  <div className="admissions-apply-confirm" role="dialog" aria-labelledby="apply-confirm-title">
                    <h3 id="apply-confirm-title" className="admissions-apply-confirm__title">
                      Thibitisha taarifa za maombi yako
                    </h3>
                    <p className="admissions-apply-confirm__lead">
                      Angalia taarifa ulizoandika hapa chini. Zikiwa sahihi, thibitisha ili tuzitume kwa Ofisi ya
                      Udahili.
                    </p>
                    <ul className="admissions-apply-confirm__list">
                      {submitSummaryItems.map(({ label, value }) => (
                        <li key={label}>
                          <span className="admissions-apply-confirm__term">{label}</span>
                          <span className="admissions-apply-confirm__value">{value}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="admissions-apply-confirm__actions">
                      <button
                        type="button"
                        className="admissions-apply-confirm__btn admissions-apply-confirm__btn--secondary"
                        onClick={handleCancelConfirm}
                        disabled={loading}
                      >
                        Sitisha
                      </button>
                      <button
                        type="button"
                        className="admissions-apply-confirm__btn admissions-apply-confirm__btn--primary"
                        onClick={handleConfirmSubmit}
                        disabled={loading}
                      >
                        {loading ? 'Inatuma maombi...' : 'Ndiyo, tuma maombi'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {!formLocked && !showSubmitConfirm ? (
                  <>
                    <p className="hint admissions-apply-form__hint">
                      {isRejected ? (
                        <>
                          Sahihisha sehemu zilizo na alama ya <span className="form-required">*</span>, kisha bonyeza{' '}
                          <strong>Tuma Maombi</strong> ili kutuma maombi mapya.
                        </>
                      ) : (
                        <>
                          Sehemu zenye alama ya <span className="form-required">*</span> ni lazima. Ukishabonyeza{' '}
                          <strong>Tuma Maombi</strong>, utaona muhtasari wa kuthibitisha kabla ya kutuma.
                        </>
                      )}
                    </p>
                    <button className="primary" disabled={loading} type="submit">
                      {loading ? 'Inaandaa...' : 'Tuma Maombi'}
                    </button>
                  </>
                ) : null}

                {formLocked ? (
                  <p className="hint admissions-apply-form__hint">
                    {isApproved
                      ? 'Maombi yako yamekubaliwa. Taarifa hizi haziwezi kubadilishwa. Wasiliana na Ofisi ya Udahili ikiwa unahitaji msaada zaidi.'
                      : 'Huwezi kubadilisha fomu hadi Ofisi ya Udahili itakapojibu. Majibu yataonekana hapa juu.'}
                  </p>
                ) : null}
              </form>
                </>
              )}
            </>
          )}
        </section>
        ) : null}
        </div>
      </div>
    </PublicLayout>
  );
};

export default AdmissionsApply;

