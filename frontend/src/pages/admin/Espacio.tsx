import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreHorizontal, Layers, CheckCircle2, Wrench, XCircle, Monitor, FlaskConical, Presentation, Building, Users } from 'lucide-react';
import { AgregarEspacioModal } from '../../components/shared/AgregarEspacioModal';
import { VistaEstaciones } from '../../components/shared/VistaEstaciones';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
import { useAuth } from '../../context/AuthContext';
import { isReadOnlyView } from '../../utils/roleGuard';
import { laboratoriosService } from '../../services/laboratorios.service';
import '../../css/inventario.css';
import '../../css/espacios.css';
import '../../css/Usuarios.css';

interface EspacioItem {
  id: string;
  nombre: string;
  modo_reserva: 'espacio_completo' | 'por_estacion';
  edificio: string;
  piso: string;
  aula: string;
  capacidad_maxima: number;
  estado: string;
  descripcion?: string;
  ocupado?: boolean;
  coordinador_id?: string;
  roles_permitidos?: string[];
  estaciones_disponibles?: string | number;
}

export const EspacioView: React.FC = () => {
  const { user } = useAuth();
  const readOnly = user ? isReadOnlyView(user.rol as any) : false;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [espacios, setEspacios] = useState<EspacioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<EspacioItem | undefined>(undefined);

  // Estados para gestionar estaciones de un lab específico
  const [gestionarLabId, setGestionarLabId] = useState<string | null>(null);
  const [gestionarLabNombre, setGestionarLabNombre] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [espacioToDelete, setEspacioToDelete] = useState<string | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<string>('todos');
  const filterRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const fetchEspacios = async () => {
    setLoading(true);
    try {
      const json = await laboratoriosService.getLaboratorios();
      if (json.status === 'success') {
        setEspacios(json.data);
      }
    } catch (error) {
      console.error('Error fetching laboratorios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEspacios();
  }, []);

  const getIconForLab = (nombre: string) => {
    const nameLower = nombre.toLowerCase();
    if (nameLower.includes('computo') || nameLower.includes('sistemas') || nameLower.includes('pc') || nameLower.includes('informática')) return <Monitor size={24} color="#219653" />;
    if (nameLower.includes('auditorio') || nameLower.includes('conferencia') || nameLower.includes('charla')) return <Presentation size={24} color="#9B51E0" />;
    if (nameLower.includes('fisica') || nameLower.includes('quimica') || nameLower.includes('ciencia') || nameLower.includes('biologia')) return <FlaskConical size={24} color="#F2C94C" />;
    return <Building size={24} color="#2D9CDB" />; 
  };

  const handleEdit = (item: EspacioItem) => {
    setEditData(item);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDeleteClick = (id: string) => {
    setEspacioToDelete(id);
    setIsDeleteModalOpen(true);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!espacioToDelete) return;
    
    try {
      const data = await laboratoriosService.deleteLaboratorio(espacioToDelete);
      if (data.status === 'success') {
        customToast.success('Espacio eliminado correctamente');
        fetchEspacios();
      } else {
        customToast.error(data.message || 'Error al eliminar el espacio');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      customToast.error('Error al conectar con el servidor');
    }
    setIsDeleteModalOpen(false);
    setEspacioToDelete(null);
  };

  const openAddModal = () => {
    setEditData(undefined);
    setIsModalOpen(true);
  };

  const espaciosDelUsuario = user?.rol === 'coordinador' 
    ? espacios.filter(e => e.coordinador_id === user.id)
    : espacios;

  const totalEspacios = espaciosDelUsuario.length;
  const ocupados = espaciosDelUsuario.filter(e => e.ocupado === true).length;
  const disponibles = espaciosDelUsuario.filter(e => e.estado === 'disponible' && !e.ocupado).length;
  const enMantenimiento = espaciosDelUsuario.filter(e => e.estado === 'mantenimiento' || e.estado === 'en_mantenimiento').length;
  const clausurados = espaciosDelUsuario.filter(e => e.estado === 'clausurado').length;
  
  // Sumar todas las estaciones disponibles
  const totalEstacionesDisponibles = espaciosDelUsuario.reduce((acc, curr) => acc + (parseInt(curr.estaciones_disponibles as string) || 0), 0);

  const filteredEspacios = espaciosDelUsuario.filter(item => {
    const matchSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterMode === 'todos' 
      ? true 
      : item.modo_reserva === filterMode;
    return matchSearch && matchFilter;
  });

  return (
    <div className="espacios-container">
      {gestionarLabId ? (
        <VistaEstaciones
          laboratorioId={gestionarLabId}
          laboratorioNombre={gestionarLabNombre}
          onVolver={() => {
            setGestionarLabId(null);
            setGestionarLabNombre('');
          }}
        />
      ) : (
        <>
          <div className="metrics-container">
            <div className="metric-item">
              <div className="metric-icon-wrapper">
                <Layers size={32} color="#219653" />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Espacios</span>
                <span className="metric-value">{totalEspacios}</span>
              </div>
            </div>
            
            <div className="metric-item">
              <div className="metric-icon-wrapper">
                <CheckCircle2 size={32} color="#219653" />
              </div>
              <div className="metric-info">
                <span className="metric-label">Disponibles</span>
                <span className="metric-value">{disponibles}</span>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon-wrapper">
                <Monitor size={32} color="#9b59b6" />
              </div>
              <div className="metric-info">
                <span className="metric-label">Estaciones Disp.</span>
                <span className="metric-value">{totalEstacionesDisponibles}</span>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon-wrapper">
                <Wrench size={32} color="#F2C94C" />
              </div>
              <div className="metric-info">
                <span className="metric-label">En Mantenimiento</span>
                <span className="metric-value">{enMantenimiento}</span>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon-wrapper">
                <XCircle size={32} color="#b39d9d" />
              </div>
              <div className="metric-info">
                <span className="metric-label">Clausurados</span>
                <span className="metric-value">{clausurados}</span>
              </div>
            </div>
          </div>

          <div className="inventario-controls" style={{ marginTop: '40px', padding: '0 20px' }}>
            <div className="search-inventory">
              <Search className="search-inventory-icon" size={16} />
              <input 
                type="text" 
                placeholder="Buscar Espacio por Nombre" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }} ref={filterRef}>
                <button 
                  className="btn-filter" 
                  style={{ borderRadius: '20px' }}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Filter size={16} />
                  <span>Filtros</span>
                </button>

                {isFilterOpen && (
                  <div className="filter-dropdown-menu">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Filtros</span>
                      <button 
                        onClick={() => { setFilterMode('todos'); setIsFilterOpen(false); }}
                        style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Limpiar
                      </button>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Por Tipo de Espacio</label>
                      <select
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px'
                        }}
                      >
                        <option value="todos">Todos</option>
                        <option value="por_estacion">Por Estación de Trabajo</option>
                        <option value="espacio_completo">Espacio Completo</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {!readOnly && (
                <button className="btn-add-item" style={{ borderRadius: '20px', backgroundColor: '#32886c' }} onClick={openAddModal}>
                  <Plus size={16} />
                  <span>Item</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-container" style={{ overflow: 'visible' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Espacio</th>
                  <th>Tipo</th>
                  <th>Ubicación</th>
                  <th>Capacidad</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredEspacios.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No hay laboratorios registrados que coincidan.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td>
                  </tr>
                )}
                {filteredEspacios.map((item) => {
                  let estadoBadgeClass = '';
                  let estadoTexto = '';

                  if (item.estado === 'mantenimiento' || item.estado === 'en_mantenimiento') {
                    estadoBadgeClass = 'badge-warning';
                    estadoTexto = 'Mantenimiento';
                  } else if (item.estado === 'clausurado') {
                    estadoBadgeClass = 'badge-danger';
                    estadoTexto = 'Clausurado';
                  } else if (item.ocupado) {
                    estadoBadgeClass = 'badge-info';
                    estadoTexto = 'Ocupado';
                  } else {
                    estadoBadgeClass = 'badge-success';
                    estadoTexto = 'Disponible';
                  }

                  return (
                  <tr key={item.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {getIconForLab(item.nombre)}
                      <span style={{ maxWidth: '140px', display: 'inline-block' }}>{item.nombre}</span>
                    </td>
                    <td>{item.modo_reserva === 'espacio_completo' ? 'Espacio Completo' : 'Por Estación'}</td>
                    <td>{`${item.edificio}, Piso ${item.piso}, Aula ${item.aula}`}</td>
                    <td>{item.capacidad_maxima > 0 ? item.capacidad_maxima : 'Dinámica'}</td>
                    <td>
                      <span className={`badge ${estadoBadgeClass}`}>
                        {estadoTexto}
                      </span>
                    </td>
                    <td>
                      <div className="action-menu-container">
                        <button 
                          className="action-button"
                          onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                        >
                          <MoreHorizontal size={24} />
                        </button>
                        
                        {activeMenu === item.id && (
                          <div className="actions-dropdown" style={{ right: '50px' }}>
                            {item.modo_reserva === 'por_estacion' && (
                              <button 
                                className="dropdown-item"
                                onClick={() => {
                                  setGestionarLabId(item.id);
                                  setGestionarLabNombre(item.nombre);
                                  setActiveMenu(null);
                                }}
                              >
                                Ver espacio de trabajo
                              </button>
                            )}
                            <button className="dropdown-item" onClick={() => handleEdit(item)}>Editar</button>
                            <button className="dropdown-item delete" onClick={() => handleDeleteClick(item.id)}>Eliminar</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="espacios-cards">
            {filteredEspacios.map((item) => {
              let estadoBadgeClass = '';
              let estadoTexto = '';

              if (item.estado === 'mantenimiento' || item.estado === 'en_mantenimiento') {
                estadoBadgeClass = 'badge-warning';
                estadoTexto = 'Mantenimiento';
              } else if (item.estado === 'clausurado') {
                estadoBadgeClass = 'badge-danger';
                estadoTexto = 'Clausurado';
              } else if (item.ocupado) {
                estadoBadgeClass = 'badge-info';
                estadoTexto = 'Ocupado';
              } else {
                estadoBadgeClass = 'badge-success';
                estadoTexto = 'Disponible';
              }

              return (
              <div className="espacio-card" key={item.id}>
                <div className="espacio-card-header">
                  <div className="espacio-card-title">
                    {getIconForLab(item.nombre)}
                    <div>
                      <h3>{item.nombre}</h3>
                    </div>
                  </div>
                  <div className="action-menu-container">
                    <button 
                      className="action-button"
                      onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                    >
                      <MoreHorizontal size={22}/>
                    </button>
                    {activeMenu === item.id && (
                      <div className="actions-dropdown">
                        {item.modo_reserva === 'por_estacion' && (
                          <button 
                            className="dropdown-item"
                            onClick={() => {
                              setGestionarLabId(item.id);
                              setGestionarLabNombre(item.nombre);
                              setActiveMenu(null);
                            }}
                          >
                            Ver espacio de trabajo
                          </button>
                        )}
                        <button className="dropdown-item" onClick={() => handleEdit(item)}>Editar</button>
                        <button className="dropdown-item delete" onClick={() => handleDeleteClick(item.id)}>Eliminar</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="espacio-card-body">
                  <div className="info-row">
                    <span className="info-label">Tipo:</span>
                    <strong>{item.modo_reserva === "espacio_completo" ? "Espacio Completo" : "Por Estación"}</strong>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Ubicación:</span>
                    <span>{`${item.edificio}, Piso ${item.piso}, Aula ${item.aula}`}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Capacidad:</span>
                    <span>{item.capacidad_maxima > 0 ? item.capacidad_maxima : 'Dinámica'}</span>
                  </div>
                  <div className="info-row" style={{ marginTop: '8px' }}>
                    <span className="info-label">Estado:</span>
                    <span className={`badge ${estadoBadgeClass}`}>
                      {estadoTexto}
                    </span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </>
      )}

      {isModalOpen && (
        <AgregarEspacioModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchEspacios}
          editData={editData}
        />
      )}

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Eliminar Espacio"
        message="¿Estás seguro de que deseas eliminar este espacio de forma permanente?"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setEspacioToDelete(null);
        }}
      />
    </div>
  );
};
