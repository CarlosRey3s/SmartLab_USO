import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';

export const MainLayout = () => {
  const { user } = useAuth();

  // Estado inicial según el tamaño de la pantalla
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    window.innerWidth > 768
  );

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Abrir / cerrar sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="layout-container">

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        userRole={user?.rol || 'Rol Desconocido'}
      />

      <div className="main-content">

        <Navbar
          onToggleMenu={toggleSidebar}
        />

        <main className="page-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};