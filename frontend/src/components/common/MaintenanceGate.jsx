import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { maintenanceAPI } from '../../services/maintenance';
import './MaintenanceGate.css';

const POLL_MS = 20000;

/** Sign-in screen for staff/superadmin — always reachable so a logged-out
 *  superadmin can sign in and switch the notice off. */
const LOGIN_PATH = '/login';

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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
        <div className="maintenance-spinner" aria-hidden="true" />
        <span className="maintenance-checking-text">Checking site status…</span>
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

  return (
    <div className="maintenance-screen" role="alert" aria-live="polite">
      <div className="maintenance-card">
        <div className="maintenance-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="maintenance-title">Website under maintenance</h1>
        <p className="maintenance-message">{status.message}</p>
        {scheduledNote && <p className="maintenance-schedule">{scheduledNote}</p>}

        {user ? (
          <div className="maintenance-user">
            <p className="maintenance-user-text">
              Signed in as <strong>{user.full_name || user.username}</strong>
            </p>
            <button type="button" className="maintenance-logout" onClick={() => logout()}>
              Log out
            </button>
          </div>
        ) : (
          <p className="maintenance-footnote">
            Please check back later. Thank you for your patience.
          </p>
        )}
      </div>
    </div>
  );
};

export default MaintenanceGate;
