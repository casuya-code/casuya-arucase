# Railway Environment Variables Setup Guide

## 🚀 Quick Setup for Production

### 1. Required Environment Variables

Copy these values to your Railway project settings:

#### **Database (Required)**
```
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=your-railway-host.railway.app
PGPORT=5432
PGUSER=your-username
PGPASSWORD=your-password
PGDATABASE=your-database
```

#### **JWT Security (CRITICAL)**
```
JWT_SECRET_KEY=your-super-secure-256-bit-jwt-secret-key-here-minimum-32-characters
JWT_ACCESS_TOKEN_EXPIRES=900
JWT_REFRESH_SECRET=your-different-super-secure-refresh-token-secret-key-here
```

#### **Rate Limiting**
```
RATE_LIMIT_MAX=500
DB_MAX_CONCURRENT_QUERIES=80
STATEMENT_TIMEOUT_MS=60000
POOL_MAX=100
```

#### **CORS Security**
```
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

#### **Application**
```
NODE_ENV=production
PORT=5000
```

### 2. Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT Secret Key
node -e "console.log('JWT_SECRET_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Refresh Token Secret
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Railway Setup Steps

1. **Go to Railway Dashboard**
2. **Select your project**
3. **Go to Settings → Variables**
4. **Add each environment variable from above**
5. **Redeploy your application**

### 4. Security Verification

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.railway.app/health

# Database health
curl https://your-app.railway.app/api/health/database

# Security headers check
curl -I https://your-app.railway.app/api/auth/me
```

### 5. Production Checklist

- [ ] JWT secrets are 32+ characters
- [ ] DATABASE_URL is correctly set
- [ ] ALLOWED_ORIGINS includes your domain
- [ ] NODE_ENV=production
- [ ] All secrets are unique
- [ ] No default values in production

### 6. Enhanced Security Features Now Active

✅ **Refresh Token System** - 15min access + 7day refresh tokens
✅ **Progressive Rate Limiting** - 5 attempts → 15min lockout → progressive delays
✅ **Security Headers** - CSP, HSTS, XSS protection
✅ **Database Protection** - Connection pooling, query timeouts
✅ **Brute Force Protection** - Username and IP-based tracking
✅ **Audit Logging** - All authentication attempts logged

### 7. Monitoring

Your application now includes:
- Request logging with rate limit info
- Database query monitoring
- Security event tracking
- Performance metrics

Check logs in Railway dashboard for security events.

---

## 🎯 **Your application is now production-ready with enterprise-grade security!**
