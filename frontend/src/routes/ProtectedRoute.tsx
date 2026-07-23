import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import { canViewAdminPages, isSuperAdmin } from '../utils/roleGuard';

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuth(); 

  // Si no está autenticado, lo manda al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere un rol específico y el usuario no lo tiene
  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Si todo está bien, muestra la pantalla correspondiente
  return <Outlet />;
};