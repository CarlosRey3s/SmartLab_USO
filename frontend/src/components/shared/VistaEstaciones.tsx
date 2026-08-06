import React, { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Trash2, Plus, X, Edit2, Check, Search } from 'lucide-react';
import { laboratoriosService } from '../../services/laboratorios.service';
import { ConfirmModal } from '../confirm-modal/ConfirmModal';
import { customToast } from '../custom-toast/CustomToast';
import '../../css/espacios.css';

interface Estacion {
  id: string;
  nombre: string;
  capacidad: number;
  estado: string;
  ocupado?: boolean;
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
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [actualizandoEstadoId, setActualizandoEstadoId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [estacionToDelete, setEstacionToDelete] = useState<string | null>(null);

  const [editandoEstacionId, setEditandoEstacionId] = useState<string | null>(null);
  const [estacionEditData, setEstacionEditData] = useState<{ nombre: string; capacidad: number | '' }>({ nombre: '', capacidad: 1 });
  
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEstaciones = async () => {
    if (!laboratorioId) return;
    setLoading(true);
    try {
      const json = await laboratoriosService.getEstaciones(laboratorioId);
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
      const json = await laboratoriosService.agregarEstaciones(laboratorioId, payload);
      
      if (json.status === 'success') {
        fetchEstaciones();
        setNuevaEstacionNombre('');
        setNuevaEstacionCantidad(1);
        setNuevaEstacionCapacidad(1);
        setMostrarFormulario(false);
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

  const handleEliminarClick = (estacionId: string) => {
    setEstacionToDelete(estacionId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!estacionToDelete) return;
    
    try {
      const json = await laboratoriosService.deleteEstacion(estacionToDelete);
      if (json.status === 'success') {
        customToast.success('Estación eliminada correctamente');
        fetchEstaciones();
      } else {
        customToast.error(json.message || 'Error al eliminar la estación');
      }
    } catch (err) {
      console.error(err);
      customToast.error('Error al eliminar');
    } finally {
      setIsDeleteModalOpen(false);
      setEstacionToDelete(null);
    }
  };

  const handleCambiarEstado = async (estacionId: string, nuevoEstado: string) => {
    setActualizandoEstadoId(estacionId);
    try {
      const json = await laboratoriosService.updateEstacion(estacionId, { estado: nuevoEstado });
      if (json.status === 'success') {
        fetchEstaciones();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado');
    } finally {
      setActualizandoEstadoId(null);
    }
  };

  const iniciarEdicion = (est: Estacion) => {
    setEditandoEstacionId(est.id);
    setEstacionEditData({ nombre: est.nombre, capacidad: est.capacidad });
  };

  const cancelarEdicion = () => {
    setEditandoEstacionId(null);
    setEstacionEditData({ nombre: '', capacidad: 1 });
  };

  const guardarEdicion = async (estacionId: string) => {
    if (!estacionEditData.nombre.trim() || !estacionEditData.capacidad) {
      customToast.error('Nombre y capacidad son requeridos');
      return;
    }
    setActualizandoEstadoId(estacionId);
    try {
      const json = await laboratoriosService.updateEstacion(estacionId, {
        nombre: estacionEditData.nombre.trim(),
        capacidad: Number(estacionEditData.capacidad)
      });
      if (json.status === 'success') {
        customToast.success('Estación actualizada correctamente');
        fetchEstaciones();
        cancelarEdicion();
      } else {
        customToast.error(json.message || 'Error al actualizar estación');
      }
    } catch (err) {
      console.error(err);
      customToast.error('Error al actualizar');
    } finally {
      setActualizandoEstadoId(null);
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'disponible': return '#219653'; // Verde
      case 'mantenimiento': 
      case 'en_mantenimiento': return '#F2C94C'; // Amarillo
      case 'clausurado': 
      case 'reservado': return '#EB5757'; // Rojo
      case 'ocupado': return '#2D9CDB'; // Azul
      default: return '#828282'; // Gris
    }
  };

  return (
    <div className="vista-estaciones-container">
      <div className="vista-estaciones-header">
        <div className="header-title-group">
          <button className="btn-volver" onClick={onVolver}>
            <ArrowLeft size={20} />
            Volver a Laboratorios
          </button>
          <h2 className="vista-estaciones-title">
            Estaciones - {laboratorioNombre}
          </h2>
        </div>
        <button 
          className="btn-save btn-add-station" 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? (
            <><X size={18} /> Cancelar</>
          ) : (
            <><Plus size={18} /> Añadir Estaciones</>
          )}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {mostrarFormulario && (
        <div className="agregar-estacion-panel">
          <div className="section-label">Añadir Nuevas Estaciones Rápidamente</div>
        <div className="form-row form-row-estacion">
          <div className="form-group group-prefijo">
            <label>Prefijo (Ej: PC, Mesa)</label>
            <input 
              type="text" className="form-input" 
              value={nuevaEstacionNombre} onChange={e => setNuevaEstacionNombre(e.target.value)} 
            />
          </div>
          <div className="form-group group-cantidad">
            <label>Cantidad (N)</label>
            <input 
              type="number" min="1" className="form-input" 
              value={nuevaEstacionCantidad || ''} 
              onChange={e => setNuevaEstacionCantidad(e.target.value === '' ? '' : parseInt(e.target.value))} 
            />
          </div>
          <div className="form-group group-capacidad">
            <label>Capacidad</label>
            <input 
              type="number" min="1" className="form-input" 
              value={nuevaEstacionCapacidad || ''} 
              onChange={e => setNuevaEstacionCapacidad(e.target.value === '' ? '' : parseInt(e.target.value))} 
            />
          </div>
          <div className="form-group group-btn">
            <button 
              type="button" 
              className="btn-save" 
              onClick={handleAgregarEstaciones} 
              disabled={agregando || !nuevaEstacionNombre.trim()} 
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
      )}

      <div className="estaciones-list-container">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <h3 className="section-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
            Inventario de Estaciones ({estaciones.length})
          </h3>
          
          <div className="search-inventory" style={{ flex: '1 1 200px', maxWidth: '400px', display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
            <input 
              type="text"
              placeholder="Buscar estación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', fontSize: '14px' }}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="loading-state">Cargando estaciones...</div>
        ) : estaciones.length === 0 ? (
          <div className="empty-state">No hay estaciones registradas en este espacio. Añade algunas arriba.</div>
        ) : (
          <div className="station-grid">
            {[...estaciones]
              .filter(est => est.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
              .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }))
              .map(est => {
              const displayState = est.ocupado ? 'ocupado' : est.estado;
              const color = getStatusColor(displayState);
              return (
                <div key={est.id} className="station-card" style={{ borderTopColor: color }}>
                  {editandoEstacionId === est.id ? (
                    // MODO EDICIÓN
                    <div style={{ padding: '10px' }}>
                      <div className="station-card-header" style={{ marginBottom: '10px' }}>
                        <div className="station-icon">
                          <Monitor size={24} color={color} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="action-icon-btn save" 
                            onClick={() => guardarEdicion(est.id)}
                            title="Guardar"
                            style={{ color: '#219653' }}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            className="action-icon-btn cancel" 
                            onClick={cancelarEdicion}
                            title="Cancelar"
                            style={{ color: '#EB5757' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Nombre</label>
                        <input 
                          type="text" 
                          value={estacionEditData.nombre}
                          onChange={(e) => setEstacionEditData({...estacionEditData, nombre: e.target.value})}
                          style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '14px', marginTop: '4px' }}
                        />
                      </div>
                      
                      <div className="station-details">
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>Capacidad</label>
                          <input 
                            type="number" 
                            min="1"
                            value={estacionEditData.capacidad}
                            onChange={(e) => setEstacionEditData({...estacionEditData, capacidad: e.target.value === '' ? '' : parseInt(e.target.value)})}
                            style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '14px', marginTop: '4px' }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: '10px' }}>
                          {actualizandoEstadoId === est.id && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Guardando...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // MODO VISTA
                    <>
                      <div className="station-card-header">
                        <div className="station-icon">
                          <Monitor size={24} color={color} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="action-icon-btn edit" 
                            onClick={() => iniciarEdicion(est)}
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="action-icon-btn delete" 
                            onClick={() => handleEliminarClick(est.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="station-name">{est.nombre}</div>
                      
                      <div className="station-details">
                        <span className="station-capacity">👥 {est.capacidad} {est.capacidad === 1 ? 'persona' : 'personas'}</span>
                        
                        {actualizandoEstadoId === est.id ? (
                          <div className="station-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            Actualizando...
                          </div>
                        ) : est.ocupado ? (
                          <div className="station-badge" style={{ backgroundColor: `${color}15`, color: color }}>
                            <span className="badge-dot" style={{ backgroundColor: color }}></span>
                            Ocupado
                          </div>
                        ) : (
                          <select 
                            className="station-badge" 
                            style={{ backgroundColor: `${color}15`, color: color, border: 'none', cursor: 'pointer', outline: 'none', appearance: 'none', paddingRight: '16px' }}
                            value={est.estado}
                            onChange={(e) => handleCambiarEstado(est.id, e.target.value)}
                            title="Cambiar estado"
                          >
                            <option value="disponible">Disponible</option>
                            <option value="no_disponible">No Disponible</option>
                          </select>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Estación"
        message="¿Estás seguro que deseas eliminar esta estación? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
};
