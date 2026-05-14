import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-garnet-tint">
        <p className="text-mid-grey text-sm">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Profile row missing = email not in whitelist
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-garnet-tint">
        <p className="text-mid-grey text-sm">
          Your account is not authorized. Contact Mike Dial.
        </p>
      </div>
    );
  }

  if (requireAdmin && !profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
