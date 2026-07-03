import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import '../../css/espacios.css';

interface Estacion {
  id: string;
  nombre: string;
  capacidad: number;
  estado: string;
}

interface GestionarEstacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  laboratorioId: string;
  laboratorioNombre: string;
}

export const GestionarEstacionesModal: React.FC<GestionarEstacionesModalProps> = ({ 
  isOpen, 
  onClose, 
  laboratorioId,
  laboratorioNombre
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
    if (isOpen) {
      fetchEstaciones();
      setNuevaEstacionNombre('');
      setNuevaEstacionCantidad(1);
      setNuevaEstacionCapacidad(1);
      setError('');
    }
  }, [isOpen, laboratorioId]);

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
    if (!confirm('¿Seguro que deseas eliminar esta estación?')) return;
    
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '600px', maxWidth: '95vw' }}>
        <div className="modal-header">
          <h2 className="modal-title">Estaciones - {laboratorioNombre}</h2>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>{error}</div>}
          
          {/* Formulario Agregar */}
          <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <div className="section-label" style={{ marginBottom: '12px' }}>Añadir Nuevas Estaciones</div>
            
            <div className="form-row" style={{ alignItems: 'flex-end' }}>
              <div className="form-group half" style={{ flex: 1.5 }}>
                <label>Prefijo (Ej: PC)</label>
                <input 
                  type="text" className="form-input" 
                  value={nuevaEstacionNombre} onChange={e => setNuevaEstacionNombre(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ width: '100px' }}>
                <label>Cantidad</label>
                <input 
                  type="number" min="1" className="form-input" 
                  value={nuevaEstacionCantidad || ''} 
                  onChange={e => setNuevaEstacionCantidad(e.target.value === '' ? '' : parseInt(e.target.value))} 
                />
              </div>
              <div className="form-group" style={{ width: '90px' }}>
                <label>Capacidad</label>
                <input 
                  type="number" min="1" className="form-input" 
                  value={nuevaEstacionCapacidad || ''} 
                  onChange={e => setNuevaEstacionCapacidad(e.target.value === '' ? '' : parseInt(e.target.value))} 
                />
              </div>
              <div className="form-group">
                <button type="button" className="btn-save" onClick={handleAgregarEstaciones} disabled={agregando || !nuevaEstacionNombre.trim()} style={{ padding: '10px 16px' }}>
                  {agregando ? '...' : 'Agregar'}
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
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                    Vista previa: {cant <= 1 
                      ? `${prefijo} ${start}` 
                      : `${prefijo} ${start}, ${prefijo} ${start + 1} ... ${prefijo} ${end}`}
                  </div>
                );
            })()}
          </div>

          {/* Tabla de Estaciones */}
          <div>
            <div className="section-label" style={{ marginBottom: '12px' }}>Estaciones Actuales ({estaciones.length})</div>
            {loading ? (
              <p>Cargando estaciones...</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f0f0f0' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Nombre</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Capacidad</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Estado</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Eliminar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estaciones.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '15px', textAlign: 'center', color: '#888' }}>
                          No hay estaciones registradas.
                        </td>
                      </tr>
                    ) : (
                      estaciones.map(est => (
                        <tr key={est.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}><strong>{est.nombre}</strong></td>
                          <td style={{ padding: '10px' }}>{est.capacidad}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                              backgroundColor: est.estado === 'disponible' ? '#e6f4ea' : '#fce8e6',
                              color: est.estado === 'disponible' ? '#137333' : '#c5221f'
                            }}>
                              {est.estado}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <button 
                              style={{ background: 'none', border: 'none', color: '#AD868A', cursor: 'pointer' }} 
                              onClick={() => handleEliminar(est.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
        
        <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center' }}>
          <button type="button" className="btn-cancel" onClick={onClose} style={{ minWidth: '150px' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};
