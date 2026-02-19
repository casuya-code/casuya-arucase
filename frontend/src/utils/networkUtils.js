/**
 * Network Utilities for 3G-4G Optimization
 * Provides network-aware features for Tanzanian smartphone users
 */

/**
 * Get current network information
 * @returns {Object} Network information including speed, type, and recommendations
 */
export const getNetworkInfo = () => {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const effectiveType = connection.effectiveType || '4g';
      const downlink = connection.downlink || 10; // Mbps
      const rtt = connection.rtt || 50; // Round trip time in ms
      const saveData = connection.saveData || false;
      
      // Consider slow if effectiveType is 2g/3g or downlink < 1.5 Mbps
      const isSlow = effectiveType === '2g' || 
                     effectiveType === 'slow-2g' || 
                     effectiveType === '3g' || 
                     downlink < 1.5;
      
      return {
        isSlow,
        effectiveType,
        downlink,
        rtt,
        saveData,
        // Recommendations based on network speed
        shouldLazyLoadImages: isSlow || saveData,
        shouldReduceAnimations: isSlow,
        shouldPreloadContent: !isSlow,
        maxImageQuality: isSlow ? 'medium' : 'high',
      };
    }
  }
  
  // Default to assuming slower network for Tanzanian users
  return {
    isSlow: true,
    effectiveType: '3g',
    downlink: 1,
    rtt: 200,
    saveData: false,
    shouldLazyLoadImages: true,
    shouldReduceAnimations: true,
    shouldPreloadContent: false,
    maxImageQuality: 'medium',
  };
};

/**
 * Check if device is online
 * @returns {boolean}
 */
export const isOnline = () => {
  return navigator.onLine !== false;
};

/**
 * Get recommended image loading strategy based on network
 * @returns {Object} Loading strategy configuration
 */
export const getImageLoadingStrategy = () => {
  const networkInfo = getNetworkInfo();
  
  return {
    // Lazy load threshold - how far before viewport to start loading
    threshold: networkInfo.isSlow ? 200 : 300, // pixels
    // Placeholder blur effect
    useBlur: !networkInfo.isSlow,
    // Progressive loading
    progressive: networkInfo.isSlow,
    // Low quality image placeholder
    useLQIP: networkInfo.isSlow,
  };
};

/**
 * Debounce function for network-aware operations
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds (adjusted for network speed)
 * @returns {Function} Debounced function
 */
export const networkAwareDebounce = (func, baseDelay = 300) => {
  const networkInfo = getNetworkInfo();
  // Increase delay on slow networks
  const delay = networkInfo.isSlow ? baseDelay * 2 : baseDelay;
  
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * Monitor network changes and notify
 * @param {Function} callback - Callback function when network changes
 * @returns {Function} Cleanup function
 */
export const monitorNetworkChanges = (callback) => {
  if (!('connection' in navigator)) {
    return () => {}; // No-op cleanup
  }
  
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  const handleChange = () => {
    const networkInfo = getNetworkInfo();
    callback(networkInfo);
  };
  
  // Listen for online/offline events
  window.addEventListener('online', handleChange);
  window.addEventListener('offline', handleChange);
  
  // Listen for connection changes (if supported)
  if (connection) {
    connection.addEventListener('change', handleChange);
  }
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleChange);
    window.removeEventListener('offline', handleChange);
    if (connection) {
      connection.removeEventListener('change', handleChange);
    }
  };
};

/**
 * Get optimal chunk size for data fetching based on network
 * @returns {number} Recommended chunk size
 */
export const getOptimalChunkSize = () => {
  const networkInfo = getNetworkInfo();
  
  if (networkInfo.isSlow) {
    return 10; // Smaller chunks on slow networks
  }
  return 20; // Larger chunks on fast networks
};

/**
 * Check if should use data-saving mode
 * @returns {boolean}
 */
export const shouldUseDataSavingMode = () => {
  const networkInfo = getNetworkInfo();
  return networkInfo.saveData || networkInfo.isSlow;
};
