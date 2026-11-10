import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { maintenanceAPI } from '../../services/maintenance';
import './MaintenanceGate.css';

const POLL_MS = 20000;

/** Sign-in screen for staff/superadmin — always reachable so a logged-out
 *  superadmin can sign in and switch the notice off. */
const LOGIN_PATH = '/login';

const SCHOOL_NAME = 'Arusha Catholic Seminary';

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** "FR.FRANCIS NYAKI" -> "FN" for the avatar chip. */
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Replaces the app with a maintenance notice when the superadmin has switched
 * maintenance mode on. A superadmin always passes through. The staff sign-in
 * screen stays reachable so a logged-out superadmin can sign in and switch it
 * off; normal users who sign in there are still stopped by this gate.
 *
 * Modes:
 *   everyone  — the public site and every normal user see the notice.
 *   logged_in — public pages stay open; a signed-in normal user sees the notice.
 */
const MaintenanceGate = ({ children }) => {
  const { user, logout, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const [status, setStatus] = useState(null);
  const [checked, setChecked] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await maintenanceAPI.getStatus();
      setStatus(response.data || null);
    } catch {
      // Fail open: an unreachable status endpoint must not lock the site.
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load, user?.username]);

  const isSuperAdmin = String(user?.role || '').toLowerCase() === 'superadmin';
  const isLoginScreen = pathname === LOGIN_PATH;

  // Wait for the session restore to finish before deciding: otherwise a
  // superadmin would briefly see the notice, and a signed-in normal user could
  // briefly see the app, while /auth/me is still resolving.
  const waitingForAuth = checked && status?.active === true && authLoading;

  const blocked = checked
    && !waitingForAuth
    && !isLoginScreen
    && status?.active === true
    && !isSuperAdmin
    && (status.mode === 'everyone' || Boolean(user));

  if (!checked || waitingForAuth) {
    return (
      <div className="maintenance-screen maintenance-screen--checking">
        <div className="maintenance-checking-card">
          <div className="maintenance-spinner" aria-hidden="true" />
          <span className="maintenance-checking-brand">{SCHOOL_NAME}</span>
          <span className="maintenance-checking-text">Checking site status…</span>
        </div>
      </div>
    );
  }

  if (!blocked) return children;

  const endsAt = formatWhen(status.endsAt);
  const startsAt = formatWhen(status.startsAt);
  const scheduledNote = !status.active && startsAt
    ? `Scheduled to start ${startsAt}`
    : endsAt
      ? `Expected back ${endsAt}`
      : null;

  const displayName = user?.full_name || user?.username || '';

  return (
    <div className="maintenance-screen" role="alert" aria-live="polite">
      <div className="maintenance-card">
        <header className="maintenance-brand">
          <span className="maintenance-brand-mark" aria-hidden="true">ACS</span>
          <span className="maintenance-brand-name">{SCHOOL_NAME}</span>
        </header>

        <div className="maintenance-body">
          <div className="maintenance-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path
                d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z"
                strokeLinejoin="round"
              />
              <path d="M15.5 3.5 21 9l-2 2-5.5-5.5 2-2Z" strokeLinejoin="round" />
            </svg>
          </div>

          <p className="maintenance-eyebrow">
            <span className="maintenance-eyebrow-dot" aria-hidden="true" />
            Maintenance in progress
          </p>

          <h1 className="maintenance-title">Website under maintenance</h1>
          <p className="maintenance-message">{status.message}</p>

          {scheduledNote && (
            <p className="maintenance-schedule">
              <svg
                className="maintenance-schedule-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5.2l3.2 2" strokeLinecap="round" />
              </svg>
              <span>{scheduledNote}</span>
            </p>
          )}
        </div>

        <footer className="maintenance-footer">
          {user ? (
            <div className="maintenance-user">
              <span className="maintenance-user-id">
                <span className="maintenance-avatar" aria-hidden="true">
                  {initialsOf(displayName)}
                </span>
                <span className="maintenance-user-text">
                  Signed in as <strong>{displayName}</strong>
                </span>
              </span>
              <button type="button" className="maintenance-logout" onClick={() => logout()}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  aria-hidden="true"
                >
                  <path d="M15 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 12H9" strokeLinecap="round" />
                  <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" strokeLinecap="round" />
                </svg>
                Log out
              </button>
            </div>
          ) : (
            <p className="maintenance-footnote">
              Please check back later. Thank you for your patience.
            </p>
          )}

          <p className="maintenance-refresh">
            <span className="maintenance-refresh-dot" aria-hidden="true" />
            This page updates automatically
          </p>
        </footer>
      </div>
    </div>
  );
};

export default MaintenanceGate;
