import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

/** Gate for authenticated routes. Redirects to /login, preserving the target. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // brief; a splash screen lands in Phase 0.6
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
