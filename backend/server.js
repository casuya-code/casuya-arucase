/**
 * Node.js/Express Server for Arusha Catholic Seminary
 * Main entry point
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Placeholder SVG for missing uploads (avoids 404s; shows a simple person icon)
const PLACEHOLDER_IMAGE = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/></svg>',
  'utf8'
);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174'
    ],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true, limit: '16mb' }));

// Rate limiting - tuned for ~200 users/sec (set RATE_LIMIT_MAX in .env if needed)
const rateLimitMax = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : null;
const defaultMax = process.env.NODE_ENV === 'production'
  ? (rateLimitMax || 200000)   // 200 req/s * 900s ≈ 180k per 15 min; override with RATE_LIMIT_MAX
  : 5000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: defaultMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/static/'),
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Serve uploads: if file exists send it, otherwise send placeholder (avoids 404s for missing admin/gallery photos)
// ETag + Last-Modified for 304 on reload = faster repeat loads (no re-download)
app.use('/static/uploads', (req, res, next) => {
  if (req.method !== 'GET') return next();
  const relativePath = req.path.replace(/^\//, '');
  const filePath = path.join(__dirname, 'static', 'uploads', relativePath);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
      const mtime = stat.mtime.getTime();
      const etag = `"${stat.size}-${mtime}"`;

      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= mtime) {
        res.status(304).end();
        return;
      }

      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day - fast repeat loads on mobile
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stat.mtime.toUTCString());
      return res.sendFile(filePath);
    }
  }
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.send(PLACEHOLDER_IMAGE);
});

// Serve other static files from static directory (cache for fast loading on slow/mobile)
const staticMaxAge = process.env.NODE_ENV === 'production' ? 604800 : 3600; // 7d or 1h
app.use('/static', express.static(path.join(__dirname, 'static'), {
  maxAge: staticMaxAge * 1000,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

// Health check
app.get('/health', async (req, res) => {
  try {
    const { query } = require('./config/database');
    await query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Database health check endpoint
app.get('/api/health/database', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    
    // Get table count
    const tablesResult = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Get record counts for key tables
    const keyTables = ['students', 'users', 'subjects', 'individual_scores'];
    const tableCounts = {};
    
    for (const table of keyTables) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
        tableCounts[table] = parseInt(countResult.rows[0].count);
      } catch (err) {
        tableCounts[table] = 'error';
      }
    }
    
    res.json({
      status: 'connected',
      database: {
        current_time: result.rows[0].current_time,
        version: result.rows[0].pg_version.split(',')[0],
        table_count: parseInt(tablesResult.rows[0].count),
        record_counts: tableCounts
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Request logging middleware (should be before routes)
const requestLogger = require('./middleware/requestLogger');
app.use('/api/', requestLogger);

// Routes
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/students');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware (DatabaseOverloadError -> 503; in production hide 5xx details)
app.use((err, req, res, next) => {
  if (err.name === 'DatabaseOverloadError') {
    return res.status(503).json({ message: err.message || 'Service temporarily at capacity; try again shortly.' });
  }
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = (isProd && status >= 500) ? 'Internal server error' : (err.message || 'Internal server error');
  console.error('Error:', err);
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in production, log and continue
  if (process.env.NODE_ENV === 'production') {
    console.error('Server continuing despite uncaught exception');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, log and continue
  if (process.env.NODE_ENV === 'production') {
    console.error('Server continuing despite unhandled rejection');
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET_KEY || process.env.JWT_SECRET_KEY === 'dev-secret-key')) {
    console.warn('⚠️  SECURITY: Set JWT_SECRET_KEY in production to a long random value. Default secret is not safe.');
  }
});

module.exports = { app, io };

