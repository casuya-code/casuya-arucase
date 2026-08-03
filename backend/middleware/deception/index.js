const express = require('express');

const { routerRedirect } = require('./layers/router_redirect');
const { createTarpit } = require('./layers/recursive_tarpit');
const { createTokenMonitor } = require('./layers/token_monitor');
const { createBombardierBeetle } = require('./layers/bombardier_beetle');
const { createMimicOctopus } = require('./layers/mimic_octopus');
const { createHairyFrog } = require('./layers/hairy_frog');
const { createHornedLizard } = require('./layers/horned_lizard');
const { createOpossum } = require('./layers/opossum');

function wireDeception(app, options = {}) {
  app.use(createTokenMonitor({ webhookUrl: options.webhookUrl, signingKey: options.signingKey }));
  app.use(createBombardierBeetle(options));
  app.use(createTarpit(options));
  app.use(createOpossum(options));
  app.use(createHairyFrog(options));
  app.use(createHornedLizard(options));
  app.use(createMimicOctopus(options));
  app.use(routerRedirect);
  return app;
}

function createDeceptionApp(options = {}) {
  return wireDeception(express(), options);
}

module.exports = {
  createDeceptionApp,
  wireDeception,
  routerRedirect,
  createTarpit,
  createTokenMonitor,
  createBombardierBeetle,
  createMimicOctopus,
  createHairyFrog,
  createHornedLizard,
  createOpossum,
};
