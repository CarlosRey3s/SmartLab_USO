import { useLocation } from 'react-router-dom';
import { Menu, Bell, Search } from 'lucide-react';
// import '../../css/Navbar.css'; // <-- Descomenta y ajusta esta ruta cuando crees el CSS

interface NavbarProps {
  onToggleMenu: () => void;
}

export const Navbar = ({ onToggleMenu }: NavbarProps) => {
  const location = useLocation();

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
      <div className="navbar-right">
        <div className="user-info-navbar">
          <span className="user-greeting">Hola, Astrid</span>
          {/* Usamos tu amarillo para el avatar */}
          <div className="user-avatar-navbar">A</div>
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