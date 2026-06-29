import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
// import '../../css/Navbar.css'; // <-- Descomenta y ajusta esta ruta cuando crees el CSS

interface NavbarProps {
  onToggleMenu: () => void;
}

export const Navbar = ({ onToggleMenu }: NavbarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const fullName = user ? `${user.nombres} ${user.apellidos}` : 'Usuario';
  const initials = user ? user.nombres.charAt(0).toUpperCase() : 'U';

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
    return 'Proyecto USO';
  };

  const handleLogout = () => {
    localStorage.removeItem('uso_user');
    localStorage.removeItem('uso_token');
    window.location.href = '/login';
  };

  return (
    <header className="navbar">
      
      {/* Lado Izquierdo */}
      <div className="navbar-left">
        <button className="icon-button menu-toggle" onClick={onToggleMenu}>
          <Menu size={20} strokeWidth={2} />
        </button>
        <h1 className="navbar-title">{getTitle()}</h1>
      </div>

      {/* Centro: El Buscador Protagonista */}
      <div className="navbar-center">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            className="search-input-navbar" 
            placeholder="Buscar en todo el sistema..." 
          />
        </div>
      </div>

      {/* Lado Derecho */}
      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div className="user-info-navbar" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="user-greeting">Hola, {fullName}</span>
          {/* Avatar clickeable */}
          <div 
            className="user-avatar-navbar" 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ cursor: 'pointer' }}
            title="Opciones de usuario"
          >
            {initials}
          </div>
          
          {/* Menú Desplegable */}
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: '0',
              backgroundColor: 'white',
              border: '1px solid #eee',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '8px 0',
              zIndex: 50,
              minWidth: '150px'
            }}>
              <button 
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '14px',
                  gap: '8px'
                }}
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>

        <button className="icon-button notification-button">
          <Bell size={20} strokeWidth={2} />
          {/* Un pequeño puntito de notificación para darle realismo */}
          <span className="notification-badge"></span>
        </button>
      </div>

    </header>
  );
};