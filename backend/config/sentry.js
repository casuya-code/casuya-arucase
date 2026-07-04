const Sentry = require('@sentry/node');

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    maxBreadcrumbs: 50,
  });
}

module.exports = { initSentry, Sentry };
