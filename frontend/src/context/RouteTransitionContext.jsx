import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
} from 'react';
import { Routes, useLocation } from 'react-router-dom';
import RouteNavigationProgress from '../components/common/RouteNavigationProgress';
import { clearAllBusy, handleActionClick } from '../utils/clickFeedback';

const RouteTransitionContext = createContext(null);

function locationsDiffer(a, b) {
  if (!a || !b) return false;
  return (
    a.pathname !== b.pathname ||
    a.search !== b.search ||
    a.hash !== b.hash
  );
}

function isInternalNavLink(link) {
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return false;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function RouteTransitionProvider({ children }) {
  const location = useLocation();
  const deferredLocation = useDeferredValue(location);
  const isTransitioning = locationsDiffer(location, deferredLocation);

  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target.closest('a[href]');
      if (!isInternalNavLink(link)) return;

      try {
        const url = new URL(link.getAttribute('href'), window.location.origin);
        if (
          url.pathname === location.pathname &&
          url.search === location.search &&
          url.hash === location.hash
        ) {
          return;
        }
      } catch {
        return;
      }

      document.querySelectorAll('a.is-navigating').forEach((el) => {
        el.classList.remove('is-navigating');
      });
      link.classList.add('is-navigating');
      link.setAttribute('aria-busy', 'true');
    };

    const onActionClick = (event) => {
      handleActionClick(event);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('click', onActionClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('click', onActionClick, true);
    };
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (isTransitioning) return;

    clearAllBusy();
    document.body.classList.remove('route-transitioning');
  }, [isTransitioning]);

  useEffect(() => {
    if (isTransitioning) {
      document.body.classList.add('route-transitioning');
    }
  }, [isTransitioning]);

  const value = useMemo(
    () => ({ isTransitioning, location, deferredLocation }),
    [isTransitioning, location, deferredLocation]
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      <RouteNavigationProgress active={isTransitioning} />
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const ctx = useContext(RouteTransitionContext);
  if (!ctx) {
    return { isTransitioning: false, location: null, deferredLocation: null };
  }
  return ctx;
}

/** Renders routes with deferred location to avoid suspending during sync input. */
export function DeferredRoutes({ children }) {
  const { deferredLocation } = useRouteTransition();
  return <Routes location={deferredLocation}>{children}</Routes>;
}
