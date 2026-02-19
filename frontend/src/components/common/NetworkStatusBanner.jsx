/**
 * Network Status Banner - Non-intrusive indicator for offline/poor connection
 * Shows when user is offline or on slow network (3G). Does not block or destruct existing UI.
 */
import { useState, useEffect } from 'react';
import { getNetworkInfo, isOnline, monitorNetworkChanges } from '../../utils/networkUtils';
import './NetworkStatusBanner.css';

const NetworkStatusBanner = () => {
  const [status, setStatus] = useState(null); // null | 'offline' | 'slow'

  useEffect(() => {
    const updateStatus = () => {
      if (!isOnline()) {
        setStatus('offline');
        return;
      }
      const info = getNetworkInfo();
      if (info.isSlow || info.saveData) {
        setStatus('slow');
        return;
      }
      setStatus(null);
    };

    updateStatus();

    const cleanup = monitorNetworkChanges(updateStatus);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      cleanup();
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (!status) return null;

  return (
    <div
      className={`network-status-banner network-status-banner--${status}`}
      role="status"
      aria-live="polite"
    >
      {status === 'offline' ? (
        <>
          <i className="fas fa-wifi network-status-banner__icon" aria-hidden />
          <span>No internet connection. Some features may not work. Check your connection and try again.</span>
        </>
      ) : (
        <>
          <i className="fas fa-signal network-status-banner__icon" aria-hidden />
          <span>Slow connection detected. Images load on scroll to save data.</span>
        </>
      )}
    </div>
  );
};

export default NetworkStatusBanner;
