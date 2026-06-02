import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center bg-zinc-950 text-white">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

