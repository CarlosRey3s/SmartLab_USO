import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}
/*
export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
 const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirigir al login si no está autenticado
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    // Redirigir al dashboard si el rol no está permitido
    
  }
return <Navigate to="/dashboard" replace />;
  return <Outlet />
};*/

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  
  // 1. COMENTA TU LÓGICA REAL TEMPORALMENTE
  // const { isAuthenticated, user } = useAuth(); 

  // 2. AGREGA ESTAS DOS LÍNEAS PARA FORZAR EL ACCESO:
  const isAuthenticated = true; 
  const user = { role: 'admin' }; // Pon 'admin' para que te deje ver todo, o 'estudiante'

  // Si no está autenticado, lo manda al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere un rol específico y el usuario no lo tiene
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // O a una página de "No autorizado"
  }

  // Si todo está bien, muestra la pantalla correspondiente
  return <Outlet />;
};