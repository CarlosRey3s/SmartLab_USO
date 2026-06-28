// src/routes/AppRouter.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import Login from '../pages/auth/Login';

// ESTUDIANTE
import Dashboard from "../pages/estudiante/Dashboard";
import Reservar from "../pages/estudiante/Reservar";
import { BuzonSugerencias } from "../pages/estudiante/BuzonSugerencias";

// DOCENTE
import DocenteDashboard from "../pages/docente/DocenteDashboard";

// ADMIN
import {
  CalendarioView,
  InventarioView,
  DashboardAdmin,
  Usuarios
} from '../pages/admin';

export const AppRouter = () => {
  return (
    <Router>
      <Routes>

        <Route path="/login" element={<Login />} />

        {/* PROTEGIDAS */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>

            {/* ================= ESTUDIANTE ================= */}
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="reservas" element={<Reservar />} />
            <Route path="buzon-sugerencias" element={<BuzonSugerencias />} />

            {/* ================= DOCENTE ================= */}
            <Route element={<ProtectedRoute allowedRoles={['docente', 'admin']} />}>
              <Route path="docente/dashboard" element={<DocenteDashboard />} />
              <Route path="docente/reservas" element={<Reservar />} />
            </Route>

            {/* ================= ADMIN ================= */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="admin/dashboard" element={<DashboardAdmin />} />
              <Route path="admin/usuarios" element={<Usuarios />} />
              <Route path="calendario" element={<CalendarioView />} />
              <Route path="inventario" element={<InventarioView />} />
              <Route path="admin/buzon-sugerencias" element={<BuzonSugerencias />} />
            </Route>

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </Router>
  );
};