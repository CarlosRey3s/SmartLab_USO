import "../../css/docente-dashboard.css";
import {
  Calendar,
  BookOpen,
  Monitor,
  Bell
} from "lucide-react";

export default function DocenteDashboard() {
  return (
    <div className="docente-container">

      {/* HEADER SIMPLE (opcional pero recomendado) */}
      <div className="docente-header">
        <div>
          <h2 className="docente-title">Dashboard Docente</h2>
          <p className="docente-subtitle">
            Gestión de clases, laboratorios y reservas
          </p>
        </div>
      </div>

      {/* GRID PRINCIPAL (sin KPIs) */}
      <div className="docente-grid">

        {/* MIS LABORATORIOS (ANTES KPI + PARTE DEL CONTENIDO) */}
        <div className="docente-card panel">

          <h3>Mis Laboratorios</h3>

          <div className="item highlight">
            <strong>Computo L1</strong>
            <p>Edificio A</p>
            <p>Capacidad: 30 estudiantes</p>
            <p>Disponibilidad: 10 / 16 estaciones</p>
          </div>

          <div className="item">
            <strong>Física L2</strong>
            <p>Edificio B</p>
            <p>Capacidad: 25 estudiantes</p>
            <p>Disponibilidad: 12 / 16 estaciones</p>
          </div>

          <div className="item">
            <strong>Electrónica L3</strong>
            <p>Edificio C</p>
            <p>Capacidad: 20 estudiantes</p>
            <p>Disponibilidad: 14 / 20 estaciones</p>
          </div>
        </div>

        {/* AGENDA */}
        <div className="docente-card panel">

          <h3>Agenda Académica</h3>

          <div className="item">
            <span className="time">08:00 - 10:00</span>
            <strong>Sistemas Digitales</strong>
            <p>Laboratorio Computo L1</p>
            <p>28 estudiantes</p>
          </div>

          <div className="item">
            <span className="time">10:00 - 12:00</span>
            <strong>Física Aplicada</strong>
            <p>Laboratorio Física L2</p>
            <p>25 estudiantes</p>
          </div>

          <div className="item">
            <span className="time">14:00 - 16:00</span>
            <strong>Electrónica</strong>
            <p>Laboratorio Electrónica L3</p>
            <p>20 estudiantes</p>
          </div>

        </div>

        {/* RESERVAS + NOTIFICACIONES (UNIFICADO MÁS LIMPIO) */}
        <div className="docente-card panel">

          <h3>Reservas y Notificaciones</h3>

          <div className="item warning">
            <strong>Reserva Directa</strong>
            <p>Computo L1 · Estación 04</p>
            <span>09:00 - 11:00</span>
          </div>

          <div className="item">
            <strong>Mantenimiento</strong>
            <p>Física L2</p>
            <span>14:00 - 16:00</span>
          </div>

          <div className="item info">
            <strong>Notificación</strong>
            <p>Reserva aprobada por coordinador</p>
          </div>

        </div>

      </div>
    </div>
  );
}