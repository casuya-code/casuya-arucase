/**
 * Test Security Headers Implementation
 * Verifies all security headers are properly configured
 */
const express = require('express');
const request = require('supertest');
const { securityHeaders, customSecurityHeaders } = require('./middleware/securityHeaders');
const { globalApiRateLimit } = require('./middleware/enhancedRateLimiting');

// Create test app with security middleware
const app = express();

// Apply all security middleware
app.use(securityHeaders);
app.use(customSecurityHeaders);
app.use(globalApiRateLimit);

// Test route
app.get('/test-headers', (req, res) => {
  res.json({ message: 'Security headers test' });
});

async function testSecurityHeaders() {
  console.log('🔍 Testing Security Headers Implementation\n');
  
  try {
    const response = await request(app)
      .get('/test-headers')
      .expect(200);
    
    const headers = response.headers;
    
    console.log('📋 Security Headers Check:');
    console.log('─'.repeat(50));
    
    const securityHeaders = [
      { name: 'Content-Security-Policy', required: true },
      { name: 'X-Content-Type-Options', required: true },
      { name: 'X-Frame-Options', required: true },
      { name: 'X-XSS-Protection', required: true },
      { name: 'Referrer-Policy', required: true },
      { name: 'Permissions-Policy', required: true },
      { name: 'Strict-Transport-Security', required: true },
      { name: 'X-Request-ID', required: true },
      { name: 'Cache-Control', required: false }
    ];
    
    let passed = 0;
    let failed = 0;
    
    securityHeaders.forEach(header => {
      const value = headers[header.name.toLowerCase()];
      if (value) {
        console.log(`✅ ${header.name}: ${value}`);
        passed++;
      } else if (header.required) {
        console.log(`❌ ${header.name}: MISSING`);
        failed++;
      } else {
        console.log(`⚪ ${header.name}: Not present (optional)`);
      }
    });
    
    console.log('─'.repeat(50));
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);
    
    // Test rate limiting headers
    console.log('\n🚦 Rate Limiting Headers:');
    console.log('─'.repeat(30));
    
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset'
    ];
    
    rateLimitHeaders.forEach(header => {
      const value = headers[header];
      if (value) {
        console.log(`✅ ${header}: ${value}`);
      } else {
        console.log(`⚪ ${header}: Not present`);
      }
    });
    
    // Test CORS headers
    console.log('\n🌐 CORS Headers:');
    console.log('─'.repeat(20));
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];
    
    corsHeaders.forEach(header => {
      const value = headers[header];
      if (value) {
        console.log(`✅ ${header}: ${value}`);
      } else {
        console.log(`⚪ ${header}: Not present`);
      }
    });
    
    console.log('\n🎯 Security Score:');
    console.log('─'.repeat(20));
    
    const totalRequired = securityHeaders.filter(h => h.required).length;
    const score = Math.round((passed / totalRequired) * 100);
    
    console.log(`Score: ${score}% (${passed}/${totalRequired} required headers)`);
    
    if (score >= 90) {
      console.log('🎉 EXCELLENT - Security headers are properly configured!');
    } else if (score >= 70) {
      console.log('✅ GOOD - Most security headers are configured');
    } else {
      console.log('⚠️  NEEDS IMPROVEMENT - Some security headers missing');
    }
    
    return { passed, failed, score, headers };
    
  } catch (error) {
    console.error('❌ Error testing security headers:', error.message);
    return { error: error.message };
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSecurityHeaders()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSecurityHeaders };
