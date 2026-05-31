/**
 * Filter known third-party console noise (Vercel Live toolbar, extensions).
 * Import first from main.jsx. Early handler: public/js/benign-rejections.js
 */

import { isBenignUnhandledRejection } from './benignRejections';

function isBenignZustandDeprecation(args) {
  const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
  return (
    (text.includes('[DEPRECATED]') && text.includes('zustand')) ||
    (text.includes('Default export is deprecated') && text.includes('zustand'))
  );
}

export function installBenignConsoleFilters() {
  const nativeWarn = console.warn.bind(console);
  console.warn = (...args) => {
    if (isBenignZustandDeprecation(args)) return;
    nativeWarn(...args);
  };

  const nativeError = console.error.bind(console);
  console.error = (...args) => {
    if (isBenignZustandDeprecation(args)) return;
    nativeError(...args);
  };

  const onRejection = (event) => {
    if (isBenignUnhandledRejection(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  window.addEventListener('unhandledrejection', onRejection, true);
}
