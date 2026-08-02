const express = require('express');

const { routerRedirect } = require('./layers/router_redirect');
const { createTarpit } = require('./layers/recursive_tarpit');
const { createTokenMonitor } = require('./layers/token_monitor');

function wireDeception(app, options = {}) {
  app.use(createTokenMonitor({ webhookUrl: options.webhookUrl, signingKey: options.signingKey }));
  app.use(createTarpit(options));
  app.use(routerRedirect);
  return app;
}

function createDeceptionApp(options = {}) {
  return wireDeception(express(), options);
}

module.exports = { createDeceptionApp, wireDeception, routerRedirect, createTarpit, createTokenMonitor };
