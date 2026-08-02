const fs = require('fs');
const http = require('http');
const path = require('path');
const express = require('express');
const request = require('supertest');

const { wireDeception, createTarpit } = require('../../middleware/deception');

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  wireDeception(app, options);
  app.get('/api/users', (req, res) => res.json({ users: ['alice', 'bob'] }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  return app;
}

function rawRequest(port, requestPath, { headers = {}, maxBytes } = {}) {
  return new Promise((resolve, reject) => {
    let body = '';
    const req = http.get({ host: '127.0.0.1', port, path: requestPath, headers }, (res) => {
      res.on('data', (chunk) => {
        body += chunk;
        if (maxBytes && body.length >= maxBytes) {
          req.destroy();
          resolve({ status: res.statusCode, contentType: res.headers['content-type'], length: body.length, truncated: true });
        }
      });
      res.on('end', () => resolve({ status: res.statusCode, contentType: res.headers['content-type'], length: body.length, truncated: false }));
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNRESET' && body) {
        resolve({ status: null, contentType: null, length: body.length, truncated: true });
      } else {
        reject(e);
      }
    });
  });
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

describe('deception middleware (bait routes / honeytokens / tarpit)', () => {
  let app;
  let tarpitServer;
  let tarpitPort;

  beforeAll(async () => {
    app = buildApp();
    const tarpitApp = buildApp({ threshold: 1, chunkBytes: 1024 });
    tarpitServer = await listen(tarpitApp);
    tarpitPort = tarpitServer.address().port;
  });

  afterAll(() => {
    if (tarpitServer) tarpitServer.close();
  });

  test('serves fake admin login at /wp-admin', async () => {
    const res = await request(app).get('/wp-admin');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.text).toContain('Admin Control Panel');
  });

  test('serves fake env canary at /.env with JSON content type', async () => {
    const res = await request(app).get('/.env');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.text).toContain('IF_YOU_CAN_READ_THIS_A_WEBHOOK_ALREADY_FIRED');
  });

  test('serves fake backup dashboard at /backup.zip', async () => {
    const res = await request(app).get('/backup.zip');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.text).toContain('Backup Operations Dashboard');
  });

  test('does not leak deception layer headers by default', async () => {
    const res = await request(app).get('/wp-admin');
    expect(res.headers['x-deception-layer']).toBeUndefined();
  });

  test('real API and health routes are untouched', async () => {
    const users = await request(app).get('/api/users');
    expect(users.status).toBe(200);
    expect(users.body).toEqual({ users: ['alice', 'bob'] });

    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
  });

  test('unknown non-bait path still 404s', async () => {
    const res = await request(app).get('/etc/passwd');
    expect(res.status).toBe(404);
  });

  test('crawler UA below threshold still reaches normal 404', async () => {
    const res = await request(app).get('/etc/passwd').set('User-Agent', 'Nikto/2.5');
    expect(res.status).toBe(404);
  });

  test('honeytoken path returns junk then bans the IP (protected /api stays reachable)', async () => {
    const first = await request(app).get('/assets/honeytokens/config_env_canary.json');
    expect(first.status).toBe(200);
    expect(first.headers['content-type']).toMatch(/^application\/octet-stream/);
    expect(first.body.length).toBe(8192);

    const repeat = await request(app).get('/assets/honeytokens/config_env_canary.json');
    expect(repeat.status).toBe(403);

    const bannedBait = await request(app).get('/wp-admin');
    expect(bannedBait.status).toBe(403);

    const protectedStillWorks = await request(app).get('/api/users');
    expect(protectedStillWorks.status).toBe(200);
    expect(protectedStillWorks.body).toEqual({ users: ['alice', 'bob'] });
  });

  test('crawler UA is not tarpitted on protected /api paths even above threshold', async () => {
    const tarpitOnly = buildApp({ threshold: 1, chunkBytes: 1024 });
    for (let i = 0; i < 3; i += 1) {
      const res = await request(tarpitOnly).get('/api/users').set('User-Agent', 'Nikto/2.5');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ users: ['alice', 'bob'] });
    }
  });

  test('crawler UA above threshold gets a slow octet-stream sinkhole', async () => {
    const res = await rawRequest(tarpitPort, '/etc/passwd', {
      headers: { 'User-Agent': 'Nikto/2.5' },
      maxBytes: 3000,
    });
    expect(res.truncated).toBe(true);
    expect(res.status).toBe(200);
    expect(res.contentType).toMatch(/^application\/octet-stream/);
    expect(res.length).toBeGreaterThan(0);
  });

  test('normal browser UA is never tarpitted', async () => {
    const res = await rawRequest(tarpitPort, '/etc/passwd', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
    });
    expect(res.status).toBe(404);
    expect(res.truncated).toBe(false);
  });

  test('createTarpit exposes a usable middleware factory', () => {
    const mw = createTarpit({ threshold: 5 });
    expect(typeof mw).toBe('function');
    expect(mw.length).toBe(3);
  });

  test('template asset files exist on disk', () => {
    const assetsRoot = path.join(__dirname, '..', '..', 'middleware', 'deception', 'assets');
    expect(fs.existsSync(path.join(assetsRoot, 'templates', 'admin_login_fake.html'))).toBe(true);
    expect(fs.existsSync(path.join(assetsRoot, 'templates', 'backup_dashboard.html'))).toBe(true);
    expect(fs.existsSync(path.join(assetsRoot, 'honeytokens', 'config_env_canary.json'))).toBe(true);
    expect(fs.existsSync(path.join(assetsRoot, 'honeytokens', 'database_backup_fake.sql'))).toBe(true);
  });
});
