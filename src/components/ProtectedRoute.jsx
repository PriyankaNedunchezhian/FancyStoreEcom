import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const signingOut = useRef(false);

  useEffect(() => {
    if (loading || !user || isAdmin || signingOut.current) return undefined;
    signingOut.current = true;
    logout().finally(() => {
      signingOut.current = false;
    });
    return undefined;
  }, [loading, user, isAdmin, logout]);

  if (loading || (user && !isAdmin)) {
    return (
      <div className="auth-loading">
        <p>{user && !isAdmin ? 'Admin access only. Signing out…' : 'Loading…'}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ adminOnly: true }} />;
  }

  return children;
}
