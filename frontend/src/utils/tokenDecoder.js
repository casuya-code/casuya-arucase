/**
 * JWT Token Decoder Utility
 * Helps debug token expiration issues
 */

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token string
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null;
    
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part)
    const payload = parts[1];
    
    // Base64 decode
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get token expiration info
 * @param {string} token - JWT token string
 * @returns {Object} Token expiration information
 */
export const getTokenExpirationInfo = (token) => {
  const decoded = decodeToken(token);
  
  if (!decoded) {
    return {
      valid: false,
      message: 'Invalid token format'
    };
  }
  
  if (!decoded.exp) {
    return {
      valid: false,
      message: 'Token has no expiration claim'
    };
  }
  
  const expirationDate = new Date(decoded.exp * 1000); // exp is in seconds
  const now = new Date();
  const isExpired = expirationDate < now;
  const timeUntilExpiration = expirationDate - now;
  const minutesUntilExpiration = Math.floor(timeUntilExpiration / (1000 * 60));
  const secondsUntilExpiration = Math.floor(timeUntilExpiration / 1000);
  
  return {
    valid: true,
    isExpired,
    expirationDate: expirationDate.toLocaleString(),
    issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toLocaleString() : 'Unknown',
    expiresIn: isExpired 
      ? 'EXPIRED' 
      : `${Math.abs(minutesUntilExpiration)} minutes ${Math.abs(secondsUntilExpiration % 60)} seconds`,
    timeUntilExpiration: isExpired ? 0 : timeUntilExpiration,
    minutesUntilExpiration: isExpired ? 0 : minutesUntilExpiration,
    decoded
  };
};

/**
 * Log token expiration info to console (for debugging)
 */
export const logTokenInfo = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('❌ No token found in localStorage');
    return;
  }
  
  const info = getTokenExpirationInfo(token);
  
  console.group('🔐 Token Information');
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('Valid:', info.valid);
  
  if (info.valid) {
    console.log('Issued At:', info.issuedAt);
    console.log('Expires At:', info.expirationDate);
    console.log('Status:', info.isExpired ? '❌ EXPIRED' : '✅ VALID');
    console.log('Time Until Expiration:', info.expiresIn);
    console.log('Minutes Remaining:', info.minutesUntilExpiration);
    
    if (info.decoded) {
      console.log('Token Payload:', info.decoded);
    }
  } else {
    console.log('Error:', info.message);
  }
  console.groupEnd();
  
  return info;
};

// Make available globally for easy debugging
if (typeof window !== 'undefined') {
  window.decodeToken = decodeToken;
  window.getTokenExpirationInfo = getTokenExpirationInfo;
  window.logTokenInfo = logTokenInfo;
  
  // Add console shortcut
  console.tokenInfo = logTokenInfo;
}

export default {
  decodeToken,
  getTokenExpirationInfo,
  logTokenInfo
};

