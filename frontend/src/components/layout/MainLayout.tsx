import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';

export const MainLayout = () => {
  const { user } = useAuth();
  // Inicializar estado dependiendo del tamaño de la pantalla
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  //funcion para alternar el estado
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  }
  return (
    <div className="layout-container">
      {/** le pasamos el estado al siderbar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        userName={user ? `${user.nombres} ${user.apellidos}` : 'Usuario'}
        userRole={user?.rol || 'Rol Desconocido'}
      />

      <div className="main-content">
        {/**le pasamos la funcion al boton de Navbar */}
        <Navbar  onToggleMenu={toggleSidebar}/>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};