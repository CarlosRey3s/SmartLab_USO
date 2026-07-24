import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../confirm-modal/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { laboratoriosService } from '../../services/laboratorios.service';
import { usuariosService } from '../../services/usuarios.service';
import '../../css/espacios.css';

interface AgregarEspacioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editData?: any;
}

export const AgregarEspacioModal: React.FC<AgregarEspacioModalProps> = ({ isOpen, onClose, onSuccess, editData }) => {
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [edificio, setEdificio] = useState('');
  const [piso, setPiso] = useState('');
  const [aula, setAula] = useState('');
  const [estado, setEstado] = useState<'disponible' | 'en_mantenimiento' | 'clausurado'>('disponible');
  const [modoReserva, setModoReserva] = useState<'espacio_completo' | 'por_estacion'>('espacio_completo');
  const [capacidadMaxima, setCapacidadMaxima] = useState(20);
  
  // Para modo 'por_estacion'
  const [estaciones, setEstaciones] = useState<{nombre: string, capacidad: number}[]>([]);
  const [nuevaEstacionNombre, setNuevaEstacionNombre] = useState('');
  const [nuevaEstacionCapacidad, setNuevaEstacionCapacidad] = useState(1);
  const [nuevaEstacionCantidad, setNuevaEstacionCantidad] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmUpdateOpen, setIsConfirmUpdateOpen] = useState(false);
  const [coordinadores, setCoordinadores] = useState<any[]>([]);
  const [coordinadorId, setCoordinadorId] = useState<string>('');
  const [searchTermCoordinador, setSearchTermCoordinador] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setNombre(editData.nombre || '');
        setDescripcion(editData.descripcion || '');
        setEdificio(editData.edificio || '');
        setPiso(editData.piso || '');
        setAula(editData.aula || '');
        setEstado(editData.estado || 'disponible');
        setModoReserva(editData.modo_reserva || 'espacio_completo');
        setCapacidadMaxima(editData.capacidad_maxima || 20);
        setCoordinadorId(editData.coordinador_id || '');
        if (!editData.coordinador_id) setSearchTermCoordinador('');
        setEstaciones([]); 
      } else {
        setNombre(''); setDescripcion(''); setEdificio(''); setPiso(''); setAula('');
        setEstaciones([]); setCapacidadMaxima(20); setModoReserva('espacio_completo');
        setEstado('disponible'); setCoordinadorId(''); setSearchTermCoordinador('');
      }
      setError('');
    }
  }, [isOpen, editData]);

  useEffect(() => {
    if (user?.rol === 'administrador') {
      const fetchCoordinadores = async () => {
        const data = await usuariosService.getUsuarios(user.id.toString());
        console.log('fetchCoordinadores result:', data);
        if (data.status === 'success') {
          const coords = data.data.filter((u: any) => u.rol === 'coordinador');
          console.log('coordinadores filtrados:', coords);
          setCoordinadores(coords);
          if (editData && editData.coordinador_id) {
            const found = coords.find((c: any) => c.id === editData.coordinador_id);
            if (found) {
              setSearchTermCoordinador(`${found.nombre} ${found.apellido}`);
            }
          }
        }
      };
      fetchCoordinadores();
    }
  }, [user, editData]);

  if (!isOpen) return null;

  const handleAgregarEstacion = () => {
    const prefijo = nuevaEstacionNombre.trim();
    if (!prefijo) return;
    
    const cant = Number(nuevaEstacionCantidad) || 1;
    const cap = Number(nuevaEstacionCapacidad) || 1;
    
    // Buscar el número mayor ya usado para este prefijo
    let maxNum = 0;
    // Escapar caracteres especiales del prefijo para usar en RegExp
    const regex = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')} (\\d+)$`, 'i');
    
    estaciones.forEach(est => {
      const match = est.nombre.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nuevasEstaciones = [];
    for (let i = 1; i <= cant; i++) {
      const nombreGenerado = `${prefijo} ${maxNum + i}`;
      nuevasEstaciones.push({ nombre: nombreGenerado, capacidad: cap });
    }
    setEstaciones([...estaciones, ...nuevasEstaciones]);
    
    setNuevaEstacionNombre('');
    setNuevaEstacionCapacidad(1);
    setNuevaEstacionCantidad(1);
  };

  const handleQuitarEstacion = (index: number) => {
    const nuevas = [...estaciones];
    nuevas.splice(index, 1);
    setEstaciones(nuevas);
  };

  const handleSave = () => {
    setError('');
    
    if (!nombre || !edificio || !piso || !aula) {
      setError('Por favor, completa los campos obligatorios (Nombre, Edificio, Piso, Aula).');
      return;
    }

    if (modoReserva === 'por_estacion' && estaciones.length === 0 && !editData) {
      setError('Debe agregar al menos una estación de trabajo.');
      return;
    }

    if (editData) {
      setIsConfirmUpdateOpen(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setLoading(true);
    try {
      const payload: any = {
        nombre,
        descripcion,
        edificio,
        piso,
        aula,
        estado,
        modo_reserva: modoReserva,
        capacidad_maxima: modoReserva === 'espacio_completo' ? capacidadMaxima : 0,
        estaciones: modoReserva === 'por_estacion' && !editData ? estaciones : []
      };

      if (user?.rol === 'coordinador') {
        payload.coordinador_id = user.id;
      } else if (user?.rol === 'administrador' && coordinadorId) {
        payload.coordinador_id = coordinadorId;
      }

      let data;
      if (editData) {
        data = await laboratoriosService.updateLaboratorio(editData.id, payload);
      } else {
        data = await laboratoriosService.createLaboratorio(payload);
      }

      if (data.status !== 'success') {
        throw new Error(data.message || 'Error al guardar el laboratorio');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsConfirmUpdateOpen(false);
    }
  };

  return (
    <>
      <ConfirmModal 
        isOpen={isConfirmUpdateOpen}
        title="Actualizar información"
        message="¿Estás seguro que deseas actualizar esta información?"
        confirmText="Actualizar"
        cancelText="Cancelar"
        type="info"
        onConfirm={executeSave}
        onCancel={() => setIsConfirmUpdateOpen(false)}
      />
      <div className="modal-overlay">
        <div className="modal-content espacio-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{editData ? 'Editar Espacio' : 'Agregar Espacio'}</h2>
            <p className="modal-subtitle">Ingresa la informacion del espacio-Laboratorio</p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && <div style={{color: 'red', marginBottom: '10px', fontSize: '14px'}}>{error}</div>}
          
          <div className="section-label">INFORMACION GENERAL</div>
          
          <div className="form-row">
            <div className="form-group half">
              <label>NOMBRE LABORATORIO</label>
              <input 
                type="text" placeholder="EJ: Laboratorio de computo 1" className="form-input" 
                value={nombre} onChange={e => setNombre(e.target.value)} 
              />
            </div>
            <div className="form-group half">
              <label>MODO DE RESERVA</label>
              <select 
                className="form-input select-icon" 
                value={modoReserva} 
                onChange={e => setModoReserva(e.target.value as any)}
                disabled={!!editData} // Deshabilitar cambiar el modo al editar
              >
                <option value="espacio_completo">Espacio Completo</option>
                <option value="por_estacion">Por Estación de Trabajo</option>
              </select>
            </div>
          </div>

          <div className="form-row trio">
            <div className="form-group">
              <label>EDIFICIO</label>
              <input type="text" placeholder="Ej edifcio A" className="form-input" value={edificio} onChange={e => setEdificio(e.target.value)} />
            </div>
            <div className="form-group">
              <label>PISO</label>
              <input type="text" placeholder="Ej 2do piso" className="form-input" value={piso} onChange={e => setPiso(e.target.value)} />
            </div>
            <div className="form-group">
              <label>AULA/NUMERO</label>
              <input type="text" placeholder="Ej Aula L2" className="form-input" value={aula} onChange={e => setAula(e.target.value)} />
            </div>
          </div>

          {user?.rol === 'administrador' && (
            <div className="form-group" style={{ marginBottom: '16px' }} ref={dropdownRef}>
              <label>ASIGNAR COORDINADOR (OPCIONAL)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Buscar coordinador..." 
                  value={searchTermCoordinador}
                  onChange={(e) => {
                    setSearchTermCoordinador(e.target.value);
                    setCoordinadorId(''); 
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                {isDropdownOpen && (
                  <div className="dropdown-options" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px',
                    zIndex: 10, maxHeight: '150px', overflowY: 'auto', marginTop: '4px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    <div 
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                      onMouseDown={() => {
                        setCoordinadorId('');
                        setSearchTermCoordinador('');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <em>Ninguno</em>
                    </div>
                    {coordinadores
                      .filter(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchTermCoordinador.toLowerCase()))
                      .map(c => (
                        <div 
                          key={c.id} 
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                          onMouseDown={() => {
                            setCoordinadorId(c.id);
                            setSearchTermCoordinador(`${c.nombre} ${c.apellido}`);
                            setIsDropdownOpen(false);
                          }}
                        >
                          {c.nombre} {c.apellido}
                        </div>
                      ))
                    }
                    {coordinadores.filter(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchTermCoordinador.toLowerCase())).length === 0 && (
                      <div style={{ padding: '8px 12px', color: '#888' }}>No se encontraron resultados</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CAPACIDAD GLOBAL (Sólo para Espacio Completo) */}
          {modoReserva === 'espacio_completo' && (
            <div className="form-group capacity-group">
              <label>CAPACIDAD MÁXIMA DE ESTUDIANTES</label>
              <div className="capacity-controls">
                <button className="btn-circle" onClick={() => setCapacidadMaxima(Math.max(1, capacidadMaxima - 1))}>
                  <Minus size={16} />
                </button>
                <span className="capacity-value">{capacidadMaxima}</span>
                <button className="btn-circle" onClick={() => setCapacidadMaxima(capacidadMaxima + 1)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN DE ESTACIONES (Sólo para Por Estación y si NO es edición) */}
          {modoReserva === 'por_estacion' && !editData && (
            <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
              <div className="section-label" style={{ marginBottom: '12px' }}>Añadir Estaciones de Trabajo</div>
              
              <div className="form-row" style={{ alignItems: 'flex-end' }}>
                <div className="form-group half" style={{ flex: 1.5 }}>
                  <label>Nombre / Prefijo</label>
                  <input 
                    type="text" placeholder="Ej: PC, Mesa A..." className="form-input" 
                    value={nuevaEstacionNombre} onChange={e => setNuevaEstacionNombre(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ width: '100px' }}>
                  <label>Cantidad (N)</label>
                  <input 
                    type="number" min="1" className="form-input" 
                    value={nuevaEstacionCantidad || ''} onChange={e => setNuevaEstacionCantidad(e.target.value === '' ? ('' as any) : parseInt(e.target.value))} 
                  />
                </div>
                <div className="form-group" style={{ width: '90px' }}>
                  <label>Capacidad</label>
                  <input 
                    type="number" min="1" className="form-input" 
                    value={nuevaEstacionCapacidad || ''} onChange={e => setNuevaEstacionCapacidad(e.target.value === '' ? ('' as any) : parseInt(e.target.value))} 
                  />
                </div>
                <div className="form-group">
                  <button type="button" className="btn-save" onClick={handleAgregarEstacion} style={{ padding: '10px 16px' }}>Agregar</button>
                </div>
              </div>

              {(() => {
                const prefijo = nuevaEstacionNombre.trim();
                if (!prefijo) return null;
                
                let maxNum = 0;
                const regex = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')} (\\d+)$`, 'i');
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

              {estaciones.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '13px', color: '#777', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Estaciones Añadidas ({estaciones.length})</label>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                    {estaciones.map((est, i) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '4px' }}>
                        <span><strong>{est.nombre}</strong> (Capacidad: {est.capacidad})</span>
                        <button style={{ background: 'none', border: 'none', color: '#AD868A', cursor: 'pointer' }} onClick={() => handleQuitarEstacion(i)}>
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="status-cards">
            <div 
              className={`status-card ${estado === 'disponible' ? 'active-verde' : ''}`}
              onClick={() => setEstado('disponible')}
            >
              <div className="status-title text-verde">DISPONIBLE</div>
              <div className="status-sub text-verde">Listo para usar</div>
            </div>
            
            <div 
              className={`status-card ${estado === 'en_mantenimiento' ? 'active-amarillo' : ''}`}
              onClick={() => setEstado('en_mantenimiento')}
            >
              <div className="status-title text-amarillo">EN MANTENIMIENTO</div>
              <div className="status-sub text-amarillo">En reparacion</div>
            </div>

            <div 
              className={`status-card ${estado === 'clausurado' ? 'active-rojo' : ''}`}
              onClick={() => setEstado('clausurado')}
            >
              <div className="status-title text-rojo">CLAUSURADO</div>
              <div className="status-sub text-rojo">Fuera de servicio</div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '24px' }}>
            <label>DESCRIPCION</label>
            <textarea className="form-input textarea" rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)}></textarea>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span className="footer-note">Los campos marcados son obligatorios.</span>
          <div className="footer-actions">
            <button className="btn-cancel" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};
