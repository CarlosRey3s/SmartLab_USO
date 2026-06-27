import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  BookOpen,
  Package,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import '../../index.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
  userName?: string;
  userRole?: string;
}

const menuItems = [
  { name: 'Dashboard',             path: '/dashboard',          icon: LayoutDashboard },
  { name: 'Dashboard Docente', path: '/docente/dashboard', icon: LayoutDashboard, role: 'docente' },
  { name: 'Reservar',              path: '/reservas',           icon: BookOpen        },
  { name: 'Mis Evaluaciones',      path: '/evaluaciones',       icon: ClipboardList   },
  { name: 'Gestión Evaluaciones',  path: '/admin-evaluaciones', icon: ClipboardList   },
  { name: 'Calendario',            path: '/calendario',         icon: Calendar        },
  { name: 'Inventario',            path: '/inventario',         icon: Package         },
  { name: 'Dashboard Admin',       path: '/admin/dashboard',    icon: ShieldCheck     },
  { name: 'Buzón Sugerencias',     path: '/buzon-sugerencias',  icon: MessageSquare         },
];

export const Sidebar = ({
  isOpen,
  onToggle,
  userName  = 'Astrid',
  userRole  = 'Administrador',
}: SidebarProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/docente/dashboard') return location.pathname === '/docente/dashboard';
    return location.pathname.startsWith(path);
  };

  /* Iniciales para el avatar */
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`sb${!isOpen ? ' sb--collapsed' : ''}`}>

      {/* ── Toggle button ── */}
      {onToggle && (
        <button
          className="sb__toggle"
          onClick={onToggle}
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* ── Header / Avatar ── */}
      <div className="sb__header">
        <div className="sb__avatar">
          {initials}
        </div>
        <div className="sb__brand">
          <span className="sb__brand-name">USO</span>
          <span className="sb__brand-sub">Laboratorios</span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="sb__divider" />

      {/* ── Navigation ── */}
      <nav className="sb__nav" aria-label="Menú principal">
        <ul className="sb__list">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const Icon   = item.icon;

            return (
              <li key={item.name} className="sb__item">
                <Link
                  to={item.path}
                  className={`sb__link${active ? ' sb__link--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Active indicator bar */}
                  {active && <span className="sb__indicator" />}

                  <span className="sb__icon">
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  </span>

                  <span className="sb__label">{item.name}</span>

                  {/* Active dot badge */}
                  {active && <span className="sb__dot" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Bottom user section ── */}
      <div className="sb__bottom">
        <div className="sb__divider" />

        <div className="sb__user">
          <div className="sb__user-avatar">{initials}</div>
          <div className="sb__user-info">
            <span className="sb__user-name">Hola, {userName}</span>
            <span className="sb__user-role">{userRole}</span>
          </div>
          <button className="sb__logout" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};