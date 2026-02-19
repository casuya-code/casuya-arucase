import axios from 'axios';

// Use Vite proxy in development to avoid CORS issues
// In production, use the full API URL from env
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    // Use relative URL to leverage Vite proxy
    return '/api';
  }
  return import.meta.env.VITE_API_URL || '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds - increased for complex queries
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // For FormData, remove Content-Type to let browser/Axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle blob error responses (when responseType is 'blob' but server returns JSON error)
    if (error.config?.responseType === 'blob' && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          // If not JSON, create a generic error message
          errorData = { message: 'An error occurred while processing the request' };
        }
        // Replace the blob with parsed error data for easier handling
        error.response.data = errorData;
      } catch (parseError) {
        // If we can't parse, leave it as is
        console.error('Error parsing blob error response:', parseError);
      }
    }

    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Authentication required';
      const isTokenExpired = errorMessage.toLowerCase().includes('expired') || 
                            errorMessage.toLowerCase().includes('token expired');
      
      // Don't logout if we're verifying token (let AuthContext handle it)
      // or if we're already on the login page
      if (!window.__verifyingToken && window.location.pathname !== '/login') {
        const token = localStorage.getItem('token');
        
        // Set flags so components know about the error
        error.isTokenExpired = isTokenExpired || errorMessage.toLowerCase().includes('invalid token');
        error.expirationMessage = 'Your session has expired. Please log in again.';
        
        // Only clear token if it's definitely expired or invalid
        // Delay clearing to allow components to show error messages first
        if (error.isTokenExpired || !token) {
          // Use a small delay to allow error messages to be displayed
          setTimeout(() => {
            // Double-check we're still not on login page
            if (window.location.pathname !== '/login' && !window.__verifyingToken) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              
              // Clear user state in AuthContext by dispatching a custom event
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:logout'));
              }
            }
          }, 1000); // 1 second delay to show error message
        }
        // If token exists but error is not about expiration, let component handle it
      }
    }
    
    // Handle rate limiting errors (429)
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'];
      const message = error.response?.data?.message || 'Too many requests. Please wait a moment and try again.';
      error.rateLimitMessage = retryAfter 
        ? `${message} Please wait ${retryAfter} seconds.`
        : message;
      error.isRateLimit = true;
    }

    // Never expose server internals for 5xx: show generic message to the user
    if (error.response?.status >= 500 && error.response?.data) {
      error.response.data = { ...error.response.data, message: 'Something went wrong. Please try again later.' };
    }
    
    if (!error.response) {
      console.error('Network error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

