import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Navbar.css';

interface NavbarProps {
  onToggleMenu: () => void;
}

export const Navbar = ({ onToggleMenu }: NavbarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const fullName = user
    ? `${user.nombres} ${user.apellidos}`
    : 'Usuario';

  const initials = user
    ? user.nombres.charAt(0).toUpperCase()
    : 'U';

  const getTitle = () => {
    const path = location.pathname;

    if (path === '/dashboard' || path === '/') return 'Dashboard';
    if (path === '/reservas') return 'Reservación';
    if (path === '/evaluaciones') return 'Evaluaciones';
    if (path === '/calendario') return 'Calendario';
    if (path === '/inventario') return 'Inventario';
    if (path === '/admin-evaluaciones') return 'Gestión de Evaluaciones';
    if (path === '/docente/dashboard') return 'Dashboard Docente';
    if (path === '/realizar-evaluacion') return 'Realizando Evaluación';
    if (path === '/admin/dashboard') return 'Dashboard Admin';
    if (path === '/reportes' || path === '/reportes-comentarios')
      return 'Reportes y Comentarios';
    if (path.includes('/usuarios') || path === '/admin/usuarios')
      return 'Usuarios';
    if (path.includes('/espacio') || path === '/admin/espacio')
      return 'Espacio';

    return 'Proyecto USO';
  };

  const handleLogout = () => {
    localStorage.removeItem('uso_user');
    localStorage.removeItem('uso_token');
    window.location.href = '/login';
  };

  return (
    <header className="navbar">

      {/* ========= IZQUIERDA ========= */}
      <div className="navbar-left">

        <button
          className="icon-button menu-toggle"
          onClick={onToggleMenu}
          aria-label="Abrir menú"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <h1 className="navbar-title">
          {getTitle()}
        </h1>

      </div>

      {/* ========= CENTRO ========= */}
      <div className="navbar-center">

        <div className="search-container">

          <Search
            size={16}
            className="search-icon"
          />

          <input
            type="text"
            className="search-input-navbar"
            placeholder="Buscar en todo el sistema..."
          />

        </div>

      </div>

      {/* ========= DERECHA ========= */}
      <div className="navbar-right">

        <div className="user-info-navbar">

          <span className="user-greeting">
            Hola, {fullName}
          </span>

          <div
            className="user-avatar-navbar"
            title="Opciones de usuario"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {initials}
          </div>

          {showDropdown && (

            <div className="navbar-dropdown">

              <button
                className="logout-button"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Cerrar sesión</span>
              </button>

            </div>

          )}

        </div>

        <button
          className="icon-button notification-button"
          aria-label="Notificaciones"
        >
          <Bell size={20} strokeWidth={2} />
          <span className="notification-badge"></span>
        </button>

      </div>

    </header>
  );
};