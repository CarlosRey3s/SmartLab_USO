import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Plus, MoreVertical, CheckCircle, Monitor } from 'lucide-react';
import '../../css/inventario.css';
import '../../css/Usuarios.css';
import { AgregarItemModal } from '../../components/shared/AgregarItemModal';
import { inventarioService } from '../../services/inventario.service';
import { laboratoriosService } from '../../services/laboratorios.service';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
import { useAuth } from '../../context/AuthContext';
import { isReadOnlyView } from '../../utils/roleGuard';

interface InventoryItem {
  id: string | number;
  nombre: string;
  codigo_interno: string;
  categoria: string;
  laboratorio_id: string | number;
  laboratorio_nombre?: string;
  cantidad_actual: number;
  stock_minimo: number;
  ubicacion_fisica: string;
  unidad_medida: string;
  tipo_control: string;
  numero_cas?: string;
  imagen_url?: string;
}

export const InventarioView: React.FC = () => {
  const { user } = useAuth();
  const readOnly = user ? isReadOnlyView(user.rol as any) : false;
  const [activeTab, setActiveTab] = useState<'inventario' | 'reportes'>('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | number | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState('Todos los Estados');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editData, setEditData] = useState<InventoryItem | undefined>(undefined);
  
  // Estados para los filtros avanzados
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterLab, setFilterLab] = useState('');
  const [filterState, setFilterState] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Estado para modal de confirmación de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);

  // Ref para el dropdown de filtros
  const filterRef = useRef<HTMLDivElement>(null);

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

  // Datos de la pestaña Inventario traídos de la base de datos
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [laboratoriosList, setLaboratoriosList] = useState<any[]>([]);

  useEffect(() => {
    cargarInventario();
    cargarLaboratorios();
  }, []);

  const cargarLaboratorios = async () => {
    try {
      const result = await laboratoriosService.getLaboratorios();
      if (result && result.success && result.data) {
        setLaboratoriosList(result.data);
      } else if (result && (result as any).data) {
        setLaboratoriosList((result as any).data);
      }
    } catch (error) {
      console.error("Error al cargar laboratorios:", error);
    }
  };

  const cargarInventario = async () => {
    try {
      const result = await inventarioService.getInventario();
      if (result && result.status === 'success') {
        setItems(result.data);
      } else if (result && result.data) {
        setItems(result.data);
      }
    } catch (error) {
      console.error("Error al cargar inventario:", error);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditData(item);
    setIsAddModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = (id: string | number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await inventarioService.eliminarItem(itemToDelete);
      customToast.success("Ítem eliminado", "El ítem se ha eliminado exitosamente");
      cargarInventario();
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      customToast.error("Error", error.message || 'Error al eliminar el ítem');
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const openAddModal = () => {
    setEditData(undefined);
    setIsAddModalOpen(true);
  };

  // Filtrar laboratorios por rol
  const laboratoriosDelUsuario = user?.rol === 'coordinador'
    ? laboratoriosList.filter(lab => lab.coordinador_id === user.id)
    : laboratoriosList;

  // Filtrar items por rol
  const itemsDelUsuario = user?.rol === 'coordinador'
    ? items.filter(item => {
        const lab = laboratoriosList.find(l => l.id === item.laboratorio_id);
        return lab && lab.coordinador_id === user.id;
      })
    : items;

  // Computar valores únicos de laboratorios sumando todos los espacios reales de la BD (ya filtrados)
  const uniqueLabs = Array.from(new Set([
    ...laboratoriosDelUsuario.map(lab => lab.nombre),
    ...itemsDelUsuario.map(item => item.laboratorio_nombre || `Lab ID: ${item.laboratorio_id}`)
  ]));

  // Filtrar items
  const filteredItems = itemsDelUsuario.filter(item => {
    // 1. Search term
    const searchMatch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Lab filter
    const labName = item.laboratorio_nombre || `Lab ID: ${item.laboratorio_id}`;
    const labMatch = filterLab ? labName === filterLab : true;
    
    // 3. State filter
    let estadoActual = 'Disponible';
    if (item.cantidad_actual === 0) estadoActual = 'Agotado';
    else if (item.cantidad_actual <= item.stock_minimo) estadoActual = 'Bajo Stock';
    
    const stateMatch = filterState ? estadoActual === filterState : true;

    return searchMatch && labMatch && stateMatch;
  }).sort((a, b) => {
    if (sortOrder === 'asc') {
      return Number(a.id) - Number(b.id);
    } else {
      return Number(b.id) - Number(a.id);
    }
  });

  // Estado para la tabla de Reportes de Inventario (Ejemplos estáticos)
  const [reportes] = useState<any[]>([
    {
      id: 1,
      item_nombre: 'Microscopio Binocular',
      item_codigo: 'MIC-001',
      tipo_problema: 'Dañado',
      descripcion: 'La lente del ocular derecho está rayada y no permite enfocar bien.',
      cantidad: 1,
      usuario_nombre: 'Carlos',
      usuario_apellido: 'Martínez',
      fecha_reporte: '2026-07-01T10:30:00Z',
      estado: 'Pendiente'
    },
    {
      id: 2,
      item_nombre: 'Reactivo Ácido Clorhídrico',
      item_codigo: 'R-HCL-500',
      tipo_problema: 'Agotado',
      descripcion: 'Se acabó el envase de 500ml durante la práctica de la mañana.',
      cantidad: 0,
      usuario_nombre: 'Ana',
      usuario_apellido: 'López',
      fecha_reporte: '2026-07-02T14:15:00Z',
      estado: 'Resuelto'
    },
    {
      id: 3,
      item_nombre: 'Osciloscopio Digital',
      item_codigo: 'OSC-042',
      tipo_problema: 'Préstamo',
      descripcion: 'Préstamo para proyecto de electrónica analógica.',
      cantidad: 1,
      usuario_nombre: 'Luis',
      usuario_apellido: 'García',
      fecha_reporte: '2026-07-03T09:00:00Z',
      estado: 'Entregado'
    }
  ]);

  const getReportStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Disponible': return 'badge-success';
      case 'Agotado': return 'badge-danger';
      case 'En Mantenimiento': return 'badge-warning';
      case 'Pendiente': return 'badge-warning';
      case 'Resuelto': return 'badge-success';
      case 'Devuelto': return 'badge-success';
      case 'Entregado': return 'badge-info';
      default: return 'badge-info';
    }
  };

  return (
    <div className="inventario-container">


      {/* ================= HEADER IDÉNTICO AL DE REPORTE Y COMENTARIOS ================= */}
      <div className="reports-header">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'inventario' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventario')}
          >
            Inventario
          </button>
          <button 
            className={`tab ${activeTab === 'reportes' ? 'active' : ''}`}
            onClick={() => setActiveTab('reportes')}
          >
            Reportes
          </button>
        </div>
      </div>

      {/* ================= CONTROLES / FILTROS DINÁMICOS ================= */}
      <div className="inventario-controls">
        <div className="search-inventory">
          <Search className="search-inventory-icon" size={16} />
          <input 
            type="text" 
            placeholder="Buscar en el Inventario" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

          
          <div style={{ position: 'relative' }} ref={filterRef}>
            <button className="btn-filter" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <SlidersHorizontal size={16} />
              <span>Filtros</span>
            </button>

          {isFilterOpen && activeTab === 'inventario' && (
            <div className="filter-dropdown-menu">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Filtros</span>
                <button 
                  onClick={() => { setFilterLab(''); setFilterState(''); setSortOrder('asc'); setIsFilterOpen(false); }}
                  style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Limpiar
                </button>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Por Laboratorio</label>
                <select value={filterLab} onChange={(e) => setFilterLab(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="">Todos</option>
                  {uniqueLabs.map(lab => (
                    <option key={lab} value={lab}>{lab}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Por Estado</label>
                <select value={filterState} onChange={(e) => setFilterState(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="">Todos</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Bajo Stock">Bajo Stock</option>
                  <option value="Agotado">Agotado</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ordenar por ID</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'inventario' ? (
          !readOnly && (
            <button className="btn-add-item" onClick={openAddModal}>
              <Plus size={16} />
              <span>Item</span>
            </button>
          )
        ) : (
          <select 
            className="select-report-status"
            value={reportStatusFilter}
            onChange={(e) => setReportStatusFilter(e.target.value)}
          >
            <option value="Todos los Estados">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Resuelto">Resuelto</option>
          </select>
        )}
        </div>
      </div>

      {/* ================= CONTENIDO DE TABLAS DINÁMICAS ================= */}
      
      {/* VISTA 1: TABLA DE INVENTARIO */}
      {activeTab === 'inventario' && (
        <div className="table-container inventory-table-container" style={{ overflow: 'visible' }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>nombre</th>
                <th>codigo</th>
                <th>categoria</th>
                <th>laboratorio</th>
                <th>Stock</th>
                <th>Ubicacion</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-reports-cell">
                    No hay ítems en el inventario que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td className="item-name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {item.imagen_url ? (
                          <div className="item-thumbnail-container">
                            <img src={`http://localhost:4000${item.imagen_url}`} alt={item.nombre} className="item-thumbnail" />
                            <div className="item-image-preview-tooltip">
                              <img src={`http://localhost:4000${item.imagen_url}`} alt={item.nombre} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <Monitor size={18} />
                          </div>
                        )}
                        <span style={{ fontWeight: 500 }}>{item.nombre}</span>
                      </div>
                    </td>
                    <td>{item.codigo_interno}</td>
                    <td>{item.categoria}</td>
                    <td>{item.laboratorio_nombre || `Lab ID: ${item.laboratorio_id}`}</td>
                    <td>{item.cantidad_actual} {item.unidad_medida}</td>
                    <td>{item.ubicacion_fisica || 'N/A'}</td>
                    <td>
                      {item.cantidad_actual > item.stock_minimo ? 'Disponible' : (item.cantidad_actual === 0 ? 'Agotado' : 'Bajo Stock')}
                    </td>
                    <td>
                      {!readOnly && (
                      <div className="action-menu-container">
                        <button 
                          className="action-button"
                          onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {activeMenu === item.id && (
                          <div className="actions-dropdown">
                            <button className="dropdown-item" onClick={() => handleEdit(item)}>Editar</button>
                            <button className="dropdown-item delete" onClick={() => handleDelete(item.id)}>Eliminar</button>
                          </div>
                        )}
                      </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TARJETAS PARA MÓVIL ================= */}
{activeTab === "inventario" && (
  <div className="inventory-cards">

    {filteredItems.length === 0 ? (
      <div className="inventory-card empty">
        No hay ítems en el inventario que coincidan con los filtros
      </div>
    ) : (
      filteredItems.map((item) => (
        <div className="inventory-card" key={item.id}>

          <div className="card-header">

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {item.imagen_url ? (
                <img src={`http://localhost:4000${item.imagen_url}`} alt={item.nombre} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <Monitor size={24} />
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>{item.nombre}</h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{item.codigo_interno}</span>
              </div>
            </div>

            {!readOnly && (
            <div className="action-menu-container">

              <button
                className="action-button"
                onClick={() =>
                  setActiveMenu(activeMenu === item.id ? null : item.id)
                }
              >
                <MoreVertical size={18}/>
              </button>

              {activeMenu === item.id && (
                <div className="actions-dropdown">
                  <button
                    className="dropdown-item"
                    onClick={() => handleEdit(item)}
                  >
                    Editar
                  </button>

                  <button
                    className="dropdown-item delete"
                    onClick={() => handleDelete(item.id)}
                  >
                    Eliminar
                  </button>
                </div>
              )}

            </div>
            )}

          </div>

          <div className="card-info">

            <div>
              <span>Categoría</span>
              <strong>{item.categoria}</strong>
            </div>

            <div>
              <span>Stock</span>
              <strong>{item.cantidad_actual} {item.unidad_medida}</strong>
            </div>

            <div>
              <span>Ubicación</span>
              <strong>{item.ubicacion_fisica || "N/A"}</strong>
            </div>

            <div>
              <span>Laboratorio</span>
              <strong>{item.laboratorio_nombre || `Lab ${item.laboratorio_id}`}</strong>
            </div>

            <div className="estado-item">
              <span>Estado</span>

              <strong>
                {item.cantidad_actual > item.stock_minimo
                  ? "🟢 Disponible"
                  : item.cantidad_actual === 0
                  ? "🔴 Agotado"
                  : "🟡 Bajo Stock"}
              </strong>
            </div>

          </div>

        </div>
      ))
    )}

  </div>
)}

      {/* VISTA 2: TABLA DE REPORTES DE DAÑOS/INCIDENCIAS */}
      {activeTab === 'reportes' && (
        <div className="table-container" style={{ overflow: 'visible' }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ÍTEM AFECTADO</th>
                <th>PROBLEMA</th>
                <th>CANT.</th>
                <th>REPORTADO POR</th>
                <th>FECHA</th>
                <th>ESTADO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {reportes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>No hay reportes para mostrar</td>
                </tr>
              ) : (
                reportes.map((reporte) => (
                  <tr key={reporte.id}>
                    <td>#{reporte.id}</td>
                    <td>
                      <div className="item-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="item-info" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="item-name" style={{ fontWeight: '500' }}>{reporte.item_nombre || 'Desconocido'}</span>
                          <span className="item-code" style={{ fontSize: '12px', color: '#64748B' }}>Cód: {reporte.item_codigo || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{reporte.tipo_problema}</strong>
                        <span style={{ fontSize: '12px', color: '#64748B', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={reporte.descripcion}>
                          {reporte.descripcion}
                        </span>
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 'bold' }}>{reporte.cantidad}</span></td>
                    <td>{reporte.usuario_nombre ? `${reporte.usuario_nombre} ${reporte.usuario_apellido}` : 'Sistema'}</td>
                    <td>{new Date(reporte.fecha_reporte).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${getReportStatusBadgeClass(reporte.estado)}`}>
                        {reporte.estado}
                      </span>
                    </td>
                    <td>
                      {reporte.tipo_problema === 'Préstamo' ? (
                        <>
                          {reporte.estado === 'Pendiente' && (
                            <button 
                              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                            >
                              <CheckCircle size={14} /> Entregar
                            </button>
                          )}
                          {reporte.estado === 'Entregado' && (
                            <button 
                              style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                            >
                              <CheckCircle size={14} /> Marcar Devuelto
                            </button>
                          )}
                          {reporte.estado === 'Devuelto' && (
                            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              <CheckCircle size={14} /> Devuelto
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {reporte.estado === 'Pendiente' ? (
                            <button 
                              style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                            >
                              <CheckCircle size={14} /> Resolver
                            </button>
                          ) : (
                            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              <CheckCircle size={14} /> Resuelto
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AgregarItemModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={cargarInventario}
        editData={editData}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Eliminar ítem del inventario"
        message="¿Estás seguro de que deseas eliminar este ítem del inventario? Esta acción no se puede deshacer y borrará permanentemente sus datos."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
};