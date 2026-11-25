/**
 * Security Headers Middleware
 * Adds comprehensive security headers to all responses
 */
const helmet = require('helmet');

// Custom security configuration
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      styleSrcElem: ["'self'", "'unsafe-inline'"],
      styleSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://api.cloudinary.com",
        "https://res.cloudinary.com",
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },

  // COEP require-corp breaks cross-origin images (Cloudinary, static uploads)
  crossOriginEmbedderPolicy: false,
  
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "same-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Frameguard
  frameguard: { action: 'deny' },
  
  // Hide Powered-By
  hidePoweredBy: true,
  
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // IE Compatibility
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permissions Policy
  permissionsPolicy: {
    camera: ['none'],
    microphone: ['none'],
    geolocation: ['none'],
    payment: ['none'],
    usb: ['none'],
    magnetometer: ['none'],
    gyroscope: ['none'],
    accelerometer: ['none']
  },
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // X-Content-Type-Options (handled by noSniff)
  // xContentTypeOptions: true,
  
  // X-DNS-Prefetch-Control (handled by dnsPrefetchControl)
  // xDnsPrefetchControl: false,
  
  // X-Download-Options (handled by ieNoOpen)
  // xDownloadOptions: true,
  
  // X-Frame-Options (handled by frameguard)
  // xFrameOptions: 'DENY',
  
  // X-Permitted-Cross-Domain-Policies
  xPermittedCrossDomainPolicies: false,
  
  // X-XSS-Protection (handled by xssFilter)
  // xXssProtection: "1; mode=block"
});

// Additional custom security headers
const customSecurityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  
  // Add custom headers
  res.setHeader('X-Request-ID', generateRequestId());
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Cache control for authenticated routes
  if (req.user) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // CORS headers — keep in sync with utils/hostingEnv.js (Express cors middleware)
  const { isOriginAllowed } = require('../utils/hostingEnv');
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  next();
};

// Generate unique request ID
const generateRequestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Rate limiting headers
const rateLimitHeaders = (rateLimitInfo) => {
  return (req, res, next) => {
    if (rateLimitInfo) {
      res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit || 'unknown');
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining || 'unknown');
      res.setHeader('X-RateLimit-Reset', rateLimitInfo.reset || 'unknown');
    }
    next();
  };
};

const SENSITIVE_KEY = /pass(word)?|pwd|secret|token|auth|cookie|session|national.?id|id.?no|phone|email|student|dob|address|adm/i;

// Used only to detect attack patterns. Sensitive values are removed before
// serialization, and the result is never written to logs.
const safeSerializeForScan = (value) => {
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value, (key, val) => {
      if (key && SENSITIVE_KEY.test(key)) return undefined;
      if (typeof val === 'string' && val.length > 4000) return val.slice(0, 4000);
      if (typeof val === 'bigint') return val.toString();
      return val;
    });
  } catch (_) {
    return '';
  }
};

const safeObjectKeys = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value).slice(0, 30);
};

const safeRequestPath = (req) => {
  try {
    return new URL(req.originalUrl || req.url, 'http://localhost').pathname.slice(0, 500);
  } catch (_) {
    return String(req.url || '').split('?')[0].slice(0, 500);
  }
};

// Security monitoring middleware
const securityMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection attempts
    /javascript:/i,  // JavaScript protocol
    /data:.*base64/i  // Base64 encoded data
  ];
  
  const bodyScan = safeSerializeForScan(req.body);
  const queryScan = safeSerializeForScan(req.query);
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) ||
    pattern.test(bodyScan) ||
    pattern.test(queryScan)
  );
  
  if (isSuspicious) {
    // Log a minimal summary only: never the raw body, query values, or full URL.
    console.warn('🚨 Suspicious request detected:', {
      ip: req.ip,
      method: req.method,
      path: safeRequestPath(req),
      userAgent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 300) : undefined,
      bodyKeys: safeObjectKeys(req.body),
      queryKeys: safeObjectKeys(req.query)
    });
  }
  
  // Monitor response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // 5 seconds
      console.warn('🐌 Slow request detected:', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        duration: `${duration}ms`
      });
    }
  });
  
  next();
};

module.exports = {
  securityHeaders,
  customSecurityHeaders,
  rateLimitHeaders,
  securityMonitor,
  generateRequestId
};
