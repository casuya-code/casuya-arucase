/**
 * Authentication Debug Utility
 * Helps diagnose token storage and API authentication issues
 */

export const debugAuth = {
  // Check current authentication state
  checkAuthState() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.group('🔐 AUTHENTICATION DEBUG STATE');
    console.log('Token exists:', !!token);
    console.log('Token length:', token?.length || 0);
    console.log('Token prefix:', token ? token.substring(0, 20) + '...' : 'none');
    console.log('User in localStorage:', !!user);
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('Current URL:', window.location.href);
    console.log('User agent:', navigator.userAgent);
    
    // Parse JWT token if available
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('JWT payload:', payload);
          console.log('JWT expires at:', new Date(payload.exp * 1000).toISOString());
          console.log('JWT expired:', Date.now() > payload.exp * 1000);
        }
      } catch (error) {
        console.error('Error parsing JWT:', error);
      }
    }
    
    console.groupEnd();
    
    return {
      hasToken: !!token,
      hasUser: !!user,
      tokenLength: token?.length || 0,
      localStorageKeys: Object.keys(localStorage)
    };
  },
  
  // Test API call with current token
  async testApiCall() {
    const token = localStorage.getItem('token');
    
    console.group('🔐 API CALL TEST');
    console.log('Testing /api/auth/me endpoint...');
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        console.log('✅ API call successful');
      } else {
        console.log('❌ API call failed:', data.message);
      }
      
      return { success: response.ok, status: response.status, data };
    } catch (error) {
      console.error('❌ API call error:', error);
      return { success: false, error: error.message };
    } finally {
      console.groupEnd();
    }
  },
  
  // Clear all auth data
  clearAuth() {
    console.log('🔐 Clearing authentication data...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('✅ Auth data cleared');
  },
  
  // Simulate login with test data
  simulateLogin(token) {
    console.log('🔐 Simulating login with test token...');
    localStorage.setItem('token', token);
    console.log('✅ Test token stored');
    this.checkAuthState();
  },
  
  // Decode and validate current JWT token
  validateCurrentToken() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('🔐 No token found in localStorage');
      return { valid: false, reason: 'No token' };
    }
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('🔐 Invalid JWT format');
        return { valid: false, reason: 'Invalid JWT format' };
      }
      
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      
      const now = Date.now() / 1000;
      const expired = payload.exp < now;
      const expiresAt = new Date(payload.exp * 1000).toISOString();
      
      console.group('🔐 JWT TOKEN VALIDATION');
      console.log('Header:', header);
      console.log('Payload:', payload);
      console.log('Current time:', new Date(now * 1000).toISOString());
      console.log('Expires at:', expiresAt);
      console.log('Expired:', expired);
      console.log('Time until expiry:', expired ? 'EXPIRED' : `${Math.floor(payload.exp - now)} seconds`);
      console.groupEnd();
      
      return {
        valid: !expired,
        expired,
        payload,
        expiresAt,
        timeUntilExpiry: expired ? 0 : Math.floor(payload.exp - now)
      };
    } catch (error) {
      console.error('🔐 Error decoding JWT:', error);
      return { valid: false, reason: 'Decode error', error: error.message };
    }
  }
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
}
