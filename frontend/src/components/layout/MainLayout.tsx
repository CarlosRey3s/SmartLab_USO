import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';

export const MainLayout = () => {
  const { user } = useAuth();
  //creamos el estado (por defecto, abierto)
  const[isSidebarOpen,setIsSidebarOpen] = useState(true);

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