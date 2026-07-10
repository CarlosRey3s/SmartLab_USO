import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreHorizontal, Layers, CheckCircle2, Wrench, XCircle, Monitor, FlaskConical, Presentation, Building } from 'lucide-react';
import { AgregarEspacioModal } from '../../components/shared/AgregarEspacioModal';
import { VistaEstaciones } from '../../components/shared/VistaEstaciones';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
import '../../css/inventario.css';
import '../../css/espacios.css';
import '../../css/usuarios.css';

interface EspacioItem {
  id: string;
  nombre: string;
  modo_reserva: string;
  edificio: string;
  piso: string;
  aula: string;
  capacidad_maxima: number;
  estado: string;
  descripcion?: string;
}

export const EspacioView: React.FC = () => {
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

  const fetchEspacios = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/laboratorios');
      const json = await res.json();
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
      const res = await fetch(`http://localhost:4000/api/laboratorios/${espacioToDelete}`, {
        method: 'DELETE'
      });
      const data = await res.json();
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

  const totalEspacios = espacios.length;
  const disponibles = espacios.filter(e => e.estado === 'disponible').length;
  const enMantenimiento = espacios.filter(e => e.estado === 'mantenimiento' || e.estado === 'en_mantenimiento').length;
  const clausurados = espacios.filter(e => e.estado === 'clausurado').length;

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
                placeholder="Buscar en el Inventario" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button className="btn-filter" style={{ borderRadius: '20px' }}>
              <Filter size={16} />
              <span>Filtros</span>
            </button>

            <button className="btn-add-item" style={{ borderRadius: '20px', backgroundColor: '#32886c' }} onClick={openAddModal}>
              <Plus size={16} />
              <span>Item</span>
            </button>
          </div>

          <div className="table-container" style={{ overflow: 'visible' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Laboratorio</th>
                  <th>tipo</th>
                  <th>Ubicacion</th>
                  <th>Capacidad</th>
                  <th>Estado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {espacios.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No hay laboratorios registrados.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td>
                  </tr>
                )}
                {espacios.map((item) => (
                  <tr key={item.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {getIconForLab(item.nombre)}
                      <span style={{ maxWidth: '140px', display: 'inline-block' }}>{item.nombre}</span>
                    </td>
                    <td>{item.modo_reserva === 'espacio_completo' ? 'Espacio Completo' : 'Por Estación'}</td>
                    <td>{`${item.edificio}, Piso ${item.piso}, Aula ${item.aula}`}</td>
                    <td>{item.capacidad_maxima > 0 ? item.capacidad_maxima : 'Dinámica'}</td>
                    <td>{item.estado}</td>
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
                ))}
              </tbody>
            </table>
          </div>

          <div className="espacios-cards">
            {espacios.map((item) => (
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
                <div className="espacio-card-info">
                  <div>
                    <span>Tipo</span>
                    <strong>{item.modo_reserva === "espacio_completo" ? "Espacio Completo" : "Por Estación"}</strong>
                  </div>
                  <div>
                    <span>Ubicación</span>
                    <strong>{item.edificio}, Piso {item.piso}, Aula {item.aula}</strong>
                  </div>
                  <div>
                    <span>Capacidad</span>
                    <strong>{item.capacidad_maxima > 0 ? item.capacidad_maxima : "Dinámica"}</strong>
                  </div>
                  <div>
                    <span>Estado</span>
                    <strong>{item.estado}</strong>
                  </div>
                </div>
              </div>
            ))}
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
