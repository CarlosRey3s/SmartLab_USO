import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Package,
  ShieldCheck,
  MessageSquare,
  Users,
  Layers,
  FileBarChart
} from 'lucide-react';

import '../../index.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
  userName?: string;
  userRole?: string;
}

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['estudiante'] },
  { name: 'Dashboard', path: '/docente/dashboard', icon: LayoutDashboard, roles: ['docente'] },
  { name: 'Dashboard', path: '/admin/dashboard', icon: ShieldCheck, roles: ['administrador', 'coordinador', 'supervisor'] },

  // Accesibles para Admin, Coordinador y Supervisor
  { name: 'Calendario', path: '/calendario', icon: Calendar, roles: ['administrador', 'coordinador', 'supervisor', 'docente', 'estudiante'] },
  { name: 'Inventario', path: '/inventario', icon: Package, roles: ['administrador', 'coordinador', 'supervisor'] },
  { name: 'Espacio', path: '/espacio', icon: Layers, roles: ['administrador', 'coordinador', 'supervisor'] },
  { name: 'R & E', path: '/reportes', icon: FileBarChart, roles: ['administrador', 'coordinador', 'supervisor'] },
  { name: 'Usuarios', path: '/admin/usuarios', icon: Users, roles: ['administrador'] },

  { name: 'Sugerencias', path: '/buzon-sugerencias', icon: MessageSquare, roles: ['estudiante', 'docente'] },
];

export const Sidebar = ({
  isOpen,
  onToggle,
  userName = 'Astrid',
  userRole = 'Administrador',
}: SidebarProps) => {

  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }

    if (path === '/docente/dashboard') {
      return location.pathname === '/docente/dashboard';
    }

    return location.pathname.startsWith(path);
  };


  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();


  // Cierra automáticamente en dispositivos pequeños
  const handleLinkClick = () => {
    if (window.innerWidth <= 992) {
      onToggle?.();
    }
  };


  return (
    <aside className={`sb${!isOpen ? ' sb--collapsed' : ''}`}>

      <div className="sb__header">

        <div className="sb__avatar">
          {initials}
        </div>

        <div className="sb__brand">
          <span className="sb__brand-name">
            USO
          </span>

          <span className="sb__brand-sub">
            Laboratorios
          </span>
        </div>

      </div>


      <div className="sb__divider" />


      <nav className="sb__nav" aria-label="Menú principal">

        <ul className="sb__list">

          {menuItems
            .filter(item => item.roles.includes(userRole.toLowerCase()))
            .map(item => {

              const active = isActive(item.path);
              const Icon = item.icon;


              return (

                <li
                  key={`${item.name}-${item.path}`}
                  className="sb__item"
                >

                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`sb__link${active ? ' sb__link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >

                    {active && (
                      <span className="sb__indicator" />
                    )}


                    <span className="sb__icon">

                      <Icon
                        size={18}
                        strokeWidth={active ? 2.2 : 1.8}
                      />

                    </span>


                    <span className="sb__label">
                      {item.name}
                    </span>


                    {active && (
                      <span className="sb__dot" />
                    )}

                  </Link>

                </li>

              );

            })}

        </ul>

      </nav>

    </aside>
  );
};