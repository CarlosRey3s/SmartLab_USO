import { useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import '../../css/solicitudes.css';
import { useAuth } from '../../context/AuthContext';
import { isReadOnlyView } from '../../utils/roleGuard';

interface Solicitud {
  id: number;
  laboratorio: string;
  rol: string;
  nombre: string;
  fecha: string;
  hora: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
}

const mockSolicitudes: Solicitud[] = [
  {
    id: 1,
    laboratorio: 'Laboratorio de Electrónica',
    rol: 'Coordinador',
    nombre: 'Carlos Pérez',
    fecha: 'Mar 14 jul',
    hora: '8:00 - 10:00',
    estado: 'pendiente'
  },
  {
    id: 2,
    laboratorio: 'Sala de demostraciones',
    rol: 'Administrador',
    nombre: 'Ana Gómez',
    fecha: 'Jue 16 jul',
    hora: '9:00 - 11:00',
    estado: 'pendiente'
  },
  {
    id: 3,
    laboratorio: 'Física I',
    rol: 'Coordinador',
    nombre: 'Luis Marín',
    fecha: 'Mié 15 jul',
    hora: '8:00 - 10:00',
    estado: 'pendiente'
  }
];

export const PanelSolicitudes = () => {
  const { user } = useAuth();
  const readOnly = user ? isReadOnlyView(user.rol as any) : false;
  const [tabActiva, setTabActiva] = useState<'pendientes' | 'aprobadas' | 'rechazadas'>('pendientes');

  return (
    <div className="panel-solicitudes">
      <div className="solicitudes-header">
        <h3>Solicitudes</h3>
        <span className="badge-pendientes">3 pendientes</span>
      </div>

      <div className="solicitudes-tabs">
        <button 
          className={`tab-btn ${tabActiva === 'pendientes' ? 'active' : ''}`}
          onClick={() => setTabActiva('pendientes')}
        >
          Pendientes
        </button>
        <button 
          className={`tab-btn ${tabActiva === 'aprobadas' ? 'active' : ''}`}
          onClick={() => setTabActiva('aprobadas')}
        >
          Aprobadas
        </button>
        <button 
          className={`tab-btn ${tabActiva === 'rechazadas' ? 'active' : ''}`}
          onClick={() => setTabActiva('rechazadas')}
        >
          Rechazadas
        </button>
      </div>

      <div className="solicitudes-list">
        {mockSolicitudes.map((solicitud) => (
          <div key={solicitud.id} className="solicitud-card">
            <div className="solicitud-card-header">
              <h4>{solicitud.laboratorio}</h4>
              <span className={`rol-badge ${solicitud.rol.toLowerCase()}`}>{solicitud.rol}</span>
            </div>
            
            <div className="solicitud-info">
              <span className="solicitud-nombre">{solicitud.nombre} • {solicitud.fecha}</span>
              <span className="solicitud-hora">
                <Clock size={14} /> {solicitud.hora}
              </span>
            </div>

            {!readOnly && (
            <div className="solicitud-actions">
              <button className="btn-aprobar">
                <Check size={16} /> Aprobar
              </button>
              <button className="btn-rechazar">
                <X size={16} /> Rechazar
              </button>
            </div>
            )}
            
            <button className="btn-detalle">Ver detalle</button>
          </div>
        ))}
      </div>
    </div>
  );
};
