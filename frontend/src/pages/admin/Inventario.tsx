import React, { useState } from 'react';
import { Search, SlidersHorizontal, Plus, MoreVertical } from 'lucide-react';
import '../../css/inventario.css';

interface InventoryItem {
  id: number;
  name: string;
  code: string;
  category: string;
  laboratory: string;
  stock: number;
  location: string;
  status: string;
}

export const InventarioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventario' | 'reportes'>('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState('Todos los Estados');

  // Datos de la pestaña Inventario
  const [items] = useState<InventoryItem[]>([
    {
      id: 1,
      name: 'Osciloscopio digital',
      code: '678fh',
      category: 'Instrumento',
      laboratory: 'Lab. de Física',
      stock: 6,
      location: 'Estante A',
      status: 'Estante A'
    }
  ]);

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
          <button className="btn-add-item">
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
        <div className="inventory-table-container">
          <table className="inventory-table">
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
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td className="item-name-cell">{item.name}</td>
                  <td>{item.code}</td>
                  <td>{item.category}</td>
                  <td>{item.laboratory}</td>
                  <td>{item.stock}</td>
                  <td>{item.location}</td>
                  <td>{item.status}</td>
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
                          <button className="dropdown-item">Editar</button>
                          <button className="dropdown-item delete">Eliminar</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VISTA 2: TABLA DE REPORTES DE DAÑOS/INCIDENCIAS */}
      {activeTab === 'reportes' && (
        <div className="inventory-table-container">
          <table className="inventory-table">
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

    </div>
  );
};