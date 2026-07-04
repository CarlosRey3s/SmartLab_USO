import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Plus, MoreVertical, CheckCircle } from 'lucide-react';
import '../../css/inventario.css';
import '../../css/usuarios.css';
import { AgregarItemModal } from '../../components/shared/AgregarItemModal';
import { inventarioService } from '../../services/inventario.service';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';

interface InventoryItem {
  id: string;
  nombre: string;
  codigo_interno: string;
  categoria: string;
  laboratorio_id: string;
  cantidad_actual: number;
  stock_minimo: number;
  ubicacion_fisica: string;
  unidad_medida: string;
  tipo_control: string;
  numero_cas?: string;
  imagen_url?: string;
}

export const InventarioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventario' | 'reportes'>('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState('Todos los Estados');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editData, setEditData] = useState<InventoryItem | undefined>(undefined);
  
  // Estado para modal de confirmación de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Datos de la pestaña Inventario traídos de la base de datos
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    cargarInventario();
  }, []);

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

  const handleDelete = (id: string) => {
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
        
        <button className="btn-filter">
          <SlidersHorizontal size={16} />
          <span>Filtros</span>
        </button>

        {activeTab === 'inventario' ? (
          <button className="btn-add-item" onClick={openAddModal}>
            <Plus size={16} />
            <span>Item</span>
          </button>
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

      {/* ================= CONTENIDO DE TABLAS DINÁMICAS ================= */}
      
      {/* VISTA 1: TABLA DE INVENTARIO */}
      {activeTab === 'inventario' && (
        <div className="table-container" style={{ overflow: 'visible' }}>
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-reports-cell">
                    No hay ítems en el inventario
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id.substring(0, 8)}...</td>
                    <td className="item-name-cell">{item.nombre}</td>
                    <td>{item.codigo_interno}</td>
                    <td>{item.categoria}</td>
                    <td>Lab ID: {item.laboratorio_id.substring(0, 8)}...</td>
                    <td>{item.cantidad_actual} {item.unidad_medida}</td>
                    <td>{item.ubicacion_fisica || 'N/A'}</td>
                    <td>
                      {item.cantidad_actual > item.stock_minimo ? 'Disponible' : (item.cantidad_actual === 0 ? 'Agotado' : 'Bajo Stock')}
                    </td>
                    <td>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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