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
  // DASHBOARDS (Siempre primero)
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['estudiante'] },
  { name: 'Dashboard', path: '/docente/dashboard', icon: LayoutDashboard, roles: ['docente'] },
  { name: 'Dashboard', path: '/admin/dashboard', icon: ShieldCheck, roles: ['administrador', 'coordinador'] },

  // CALENDARIO (Segundo)
  { name: 'Calendario', path: '/calendario', icon: Calendar, roles: ['administrador', 'coordinador', 'docente', 'estudiante'] },

  // MÓDULOS DE ADMINISTRACIÓN
  { name: 'Inventario', path: '/inventario', icon: Package, roles: ['administrador', 'coordinador'] },
  { name: 'Espacio', path: '/espacio', icon: Layers, roles: ['administrador', 'coordinador'] },
  { name: 'R & E', path: '/reportes', icon: FileBarChart, roles: ['administrador', 'coordinador'] },
  { name: 'Usuarios', path: '/admin/usuarios', icon: Users, roles: ['administrador'] },

  // SUGERENCIAS (Último)
  { name: 'Sugerencias', path: '/buzon-sugerencias', icon: MessageSquare, roles: ['estudiante'] },
  { name: 'Buzón Sugerencias', path: '/admin/buzon-sugerencias', icon: MessageSquare, roles: ['administrador', 'coordinador'] },
];

export const Sidebar = ({
  isOpen,
  onToggle,
  userName = 'Astrid',
  userRole = 'Administrador',
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
          {menuItems
            .filter(item => item.roles.includes(userRole.toLowerCase()))
            .map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

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

    </aside>
  );
};