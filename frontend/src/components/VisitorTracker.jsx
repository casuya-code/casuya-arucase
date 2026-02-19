import { useEffect, useRef } from 'react';
import { publicAPI } from '../services/public';

/**
 * Visitor Tracker Component
 * Tracks visitors once per session when any public page loads
 */
const VisitorTracker = () => {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per session
    if (hasTracked.current) return;
    
    // Check if visitor was already tracked in this session
    const sessionKey = 'visitor_tracked';
    if (sessionStorage.getItem(sessionKey)) {
      hasTracked.current = true;
      return;
    }

    // Track visitor
    const trackVisitor = async () => {
      try {
        await publicAPI.trackVisitor();
        // Mark as tracked in session storage
        sessionStorage.setItem(sessionKey, 'true');
        hasTracked.current = true;
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error('Failed to track visitor:', error);
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(trackVisitor, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
};

export default VisitorTracker;

