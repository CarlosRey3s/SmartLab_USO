import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Plus, MoreVertical } from 'lucide-react';
import '../../css/inventario.css';
import '../../css/usuarios.css';
import { AgregarItemModal } from '../../components/shared/AgregarItemModal';
import { inventarioService } from '../../services/inventario.service';

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este ítem del inventario?')) return;
    
    try {
      await inventarioService.eliminarItem(id);
      cargarInventario();
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      alert(error.message || 'Error al eliminar el ítem');
    }
    setActiveMenu(null);
  };

  const openAddModal = () => {
    setEditData(undefined);
    setIsAddModalOpen(true);
  };

  // Estado para la tabla de Reportes de Inventario
  const [reportes] = useState<any[]>([]); 

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

      {/* ================= TARJETAS PARA MÓVIL ================= */}
{activeTab === "inventario" && (
  <div className="inventory-cards">

    {items.length === 0 ? (
      <div className="inventory-card empty">
        No hay ítems en el inventario
      </div>
    ) : (
      items.map((item) => (
        <div className="inventory-card" key={item.id}>

          <div className="card-header">

            <div>
              <h3>{item.nombre}</h3>
              <span>{item.codigo_interno}</span>
            </div>

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
              <strong>{item.laboratorio_id.substring(0,8)}...</strong>
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
                <th>REPORTED POR</th>
                <th>FECHA</th>
                <th>ESTADO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {reportes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-reports-cell">
                    No hay reportes para mostrar
                  </td>
                </tr>
              ) : (
                reportes.map((reporte) => (
                  <tr key={reporte.id}>
                    <td>{reporte.id}</td>
                    <td className="item-name-cell">{reporte.item}</td>
                    <td>{reporte.problema}</td>
                    <td>{reporte.cantidad}</td>
                    <td>{reporte.reportedBy}</td>
                    <td>{reporte.fecha}</td>
                    <td>{reporte.estado}</td>
                    <td>{/* Acciones */}</td>
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
    </div>
  );
};