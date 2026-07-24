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
  EspacioView,
  ReportesView,
  DashboardAdmin,
  Usuarios
} from '../pages/admin';

export const AppRouter = () => {
  return (
    <Router>
      <Routes>

        {/* Login activo */}
        <Route path="/login" element={<Login />} />

        {/* PROTEGIDAS */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>

            {/* ================= ESTUDIANTE ================= */}
            <Route element={<ProtectedRoute allowedRoles={['estudiante']} />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
            </Route>

            {/* ================= COMPARTIDA: ESTUDIANTE Y DOCENTE ================= */}
            <Route element={<ProtectedRoute allowedRoles={['estudiante', 'docente']} />}>
              <Route path="buzon-sugerencias" element={<BuzonSugerencias />} />
            </Route>

            {/* ================= DOCENTE ================= */}
            <Route element={<ProtectedRoute allowedRoles={['docente', 'administrador', 'coordinador']} />}>
              <Route path="docente/dashboard" element={<DocenteDashboard />} />
            </Route>

            {/* ================= ADMIN, COORD, SUPERVISOR ================= */}
            <Route element={<ProtectedRoute allowedRoles={['administrador', 'coordinador', 'supervisor']} />}>
              <Route path="admin/dashboard" element={<DashboardAdmin />} />
              <Route path="inventario" element={<InventarioView />} />
              <Route path="espacio" element={<EspacioView />} />
              <Route path="reportes" element={<ReportesView />} />
            </Route>

            {/* ================= ADMIN EXCLUSIVO ================= */}
            <Route element={<ProtectedRoute allowedRoles={['administrador']} />}>
              <Route path="admin/usuarios" element={<Usuarios />} />
            </Route>

            {/* ================= COMPARTIDAS ================= */}
            <Route element={<ProtectedRoute allowedRoles={['administrador', 'coordinador', 'supervisor', 'docente', 'estudiante']} />}>
              <Route path="calendario" element={<CalendarioView />} />
            </Route>

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </Router>
  );
};