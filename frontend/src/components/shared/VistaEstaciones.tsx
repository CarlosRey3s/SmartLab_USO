import React, { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Trash2 } from 'lucide-react';
import '../../css/espacios.css';

interface Estacion {
  id: string;
  nombre: string;
  capacidad: number;
  estado: string;
}

interface VistaEstacionesProps {
  laboratorioId: string;
  laboratorioNombre: string;
  onVolver: () => void;
}

export const VistaEstaciones: React.FC<VistaEstacionesProps> = ({ 
  laboratorioId,
  laboratorioNombre,
  onVolver
}) => {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form para nuevas
  const [nuevaEstacionNombre, setNuevaEstacionNombre] = useState('');
  const [nuevaEstacionCapacidad, setNuevaEstacionCapacidad] = useState<number | ''>(1);
  const [nuevaEstacionCantidad, setNuevaEstacionCantidad] = useState<number | ''>(1);
  const [agregando, setAgregando] = useState(false);

  const fetchEstaciones = async () => {
    if (!laboratorioId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/laboratorios/${laboratorioId}/estaciones`);
      const json = await res.json();
      if (json.status === 'success') {
        setEstaciones(json.data);
      } else {
        setError(json.message);
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laboratorioId]);

  const handleAgregarEstaciones = async () => {
    const prefijo = nuevaEstacionNombre.trim();
    if (!prefijo) return;
    
    const cant = Number(nuevaEstacionCantidad) || 1;
    const cap = Number(nuevaEstacionCapacidad) || 1;
    
    // Buscar el numero mayor
    let maxNum = 0;
    const regex = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`, 'i');
    
    estaciones.forEach(est => {
      const match = est.nombre.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const payload = [];
    for (let i = 1; i <= cant; i++) {
      payload.push({ nombre: `${prefijo} ${maxNum + i}`, capacidad: cap });
    }

    setAgregando(true);
    try {
      const res = await fetch(`http://localhost:4000/api/laboratorios/${laboratorioId}/estaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estaciones: payload })
      });
      const json = await res.json();
      
      if (json.status === 'success') {
        fetchEstaciones();
        setNuevaEstacionNombre('');
        setNuevaEstacionCantidad(1);
        setNuevaEstacionCapacidad(1);
      } else {
        setError(json.message);
      }
    } catch (err) {
      console.error(err);
      setError('Error al agregar');
    } finally {
      setAgregando(false);
    }
  };

  const handleEliminar = async (estacionId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta estación?')) return;
    
    try {
      const res = await fetch(`http://localhost:4000/api/laboratorios/estacion/${estacionId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.status === 'success') {
        fetchEstaciones();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'disponible': return '#219653'; // Verde
      case 'mantenimiento': 
      case 'en_mantenimiento': return '#F2C94C'; // Amarillo
      case 'clausurado': 
      case 'reservado': return '#EB5757'; // Rojo
      default: return '#828282'; // Gris
    }
  };

  const formatEstado = (estado: string) => {
    return estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="vista-estaciones-container">
      <div className="vista-estaciones-header">
        <button className="btn-volver" onClick={onVolver}>
          <ArrowLeft size={20} />
          Volver a Laboratorios
        </button>
        <h2 className="vista-estaciones-title">
          Estaciones - {laboratorioNombre}
        </h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="agregar-estacion-panel">
        <div className="section-label">Añadir Nuevas Estaciones Rápidamente</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1.5 }}>
            <label>Prefijo (Ej: PC, Mesa)</label>
            <input 
              type="text" className="form-input" 
              value={nuevaEstacionNombre} onChange={e => setNuevaEstacionNombre(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ width: '120px' }}>
            <label>Cantidad (N)</label>
            <input 
              type="number" min="1" className="form-input" 
              value={nuevaEstacionCantidad || ''} 
              onChange={e => setNuevaEstacionCantidad(e.target.value === '' ? '' : parseInt(e.target.value))} 
            />
          </div>
          <div className="form-group" style={{ width: '120px' }}>
            <label>Capacidad</label>
            <input 
              type="number" min="1" className="form-input" 
              value={nuevaEstacionCapacidad || ''} 
              onChange={e => setNuevaEstacionCapacidad(e.target.value === '' ? '' : parseInt(e.target.value))} 
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              type="button" 
              className="btn-save" 
              onClick={handleAgregarEstaciones} 
              disabled={agregando || !nuevaEstacionNombre.trim()} 
              style={{ padding: '10px 24px', height: '42px' }}
            >
              {agregando ? 'Añadiendo...' : 'Agregar'}
            </button>
          </div>
        </div>

        {/* Vista Previa */}
        {(() => {
            const prefijo = nuevaEstacionNombre.trim();
            if (!prefijo) return null;
            
            let maxNum = 0;
            const regex = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`, 'i');
            estaciones.forEach(est => {
              const match = est.nombre.match(regex);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
              }
            });
            
            const cant = Number(nuevaEstacionCantidad) || 1;
            const start = maxNum + 1;
            const end = maxNum + cant;
            
            return (
              <div style={{ marginTop: '12px', fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                Vista previa: {cant <= 1 
                  ? `${prefijo} ${start}` 
                  : `${prefijo} ${start}, ${prefijo} ${start + 1} ... ${prefijo} ${end}`}
              </div>
            );
        })()}
      </div>

      <div className="estaciones-list-container">
        <h3 className="section-label" style={{ marginBottom: '20px' }}>
          Inventario de Estaciones ({estaciones.length})
        </h3>
        
        {loading ? (
          <div className="loading-state">Cargando estaciones...</div>
        ) : estaciones.length === 0 ? (
          <div className="empty-state">No hay estaciones registradas en este espacio. Añade algunas arriba.</div>
        ) : (
          <div className="station-grid">
            {estaciones.map(est => {
              const color = getStatusColor(est.estado);
              return (
                <div key={est.id} className="station-card" style={{ borderTopColor: color }}>
                  <div className="station-card-header">
                    <div className="station-icon">
                      <Monitor size={24} color={color} />
                    </div>
                    <button 
                      className="btn-delete-station" 
                      onClick={() => handleEliminar(est.id)}
                      title="Eliminar estación"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="station-name">{est.nombre}</div>
                  
                  <div className="station-details">
                    <span className="station-capacity">👥 {est.capacidad} {est.capacidad === 1 ? 'persona' : 'personas'}</span>
                    <div className="station-badge" style={{ backgroundColor: `${color}15`, color: color }}>
                      <span className="badge-dot" style={{ backgroundColor: color }}></span>
                      {formatEstado(est.estado)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
