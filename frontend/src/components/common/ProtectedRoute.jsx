import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null, requiredModule = null, requiredAdmin = false }) => {
  const auth = useAuth();
  const { isAuthenticated, hasRole, hasPermission, hasModule, isAdminLike, loading, verifyToken } = auth;
  const [isVerifying, setIsVerifying] = useState(false);
  const location = useLocation();


  // Verify token on mount if we have a token but no user state
  useEffect(() => {
    const token = localStorage.getItem('token');
    const hasUser = isAuthenticated();
    
    // If we have a token but no user state, verify it
    if (token && !hasUser && !loading && !isVerifying) {
      setIsVerifying(true);
      verifyToken().finally(() => {
        setIsVerifying(false);
      });
    }
  }, [loading, isAuthenticated, verifyToken, isVerifying]);

  if (loading || isVerifying) {
    return <Loading />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  // Non-admin without the required module (e.g. registration) cannot access
  if (requiredModule && !isAdminLike() && !hasModule(requiredModule)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  // Admin-only routes (e.g. subjects management)
  if (requiredAdmin && !isAdminLike()) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  requiredPermission: PropTypes.string,
  requiredModule: PropTypes.string,
  requiredAdmin: PropTypes.bool,
};

export default ProtectedRoute;

