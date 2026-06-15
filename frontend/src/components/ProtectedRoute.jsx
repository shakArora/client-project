/**
 * Route guard that requires authentication and optionally enforces a specific user role.
 * Redirects unauthenticated users to login and wrong-role users to their role-specific home path.
 * @author Shivum Arora
 * @date 6/5/2026
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const ROLE_HOME = {
  administrator: '/admin',
  vendor:        '/vendor/codes',
  driver:        '/driver/route',
};

export default function ProtectedRoute({ children, role }) {
  const { token, user } = useAuth();

  // Not logged in → login page
  if (!token || !user) return <Navigate to="/login" replace />;

  // Wrong role → redirect to own home
  if (role && user.role !== role) {
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
  }

  return children;
}
