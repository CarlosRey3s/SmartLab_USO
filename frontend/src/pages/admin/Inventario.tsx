// frontend/src/pages/admin/Inventario.tsx
import React, { useState } from 'react';
import { Search, Plus, MoreVertical, Package, Filter, Edit2, Trash2 } from 'lucide-react';
import '../../css/inventario.css';

interface InventoryItem {
  id: string;
  name: string;
  code: string;
  category: string;
  location: string;
  stock: number;
  status: 'Disponible' | 'Agotado' | 'En Mantenimiento';
  image?: string;
}

export const InventarioView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Datos de ejemplo basados en la solicitud del usuario
  const [items] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Baso de Agua',
      code: '678fh',
      category: 'Vidrieria',
      location: 'Estante A',
      stock: 39,
      status: 'Disponible'
    },
    {
      id: '2',
      name: 'Microscopio Binocular',
      code: 'MB-001',
      category: 'Equipos',
      location: 'Laboratorio 1',
      stock: 5,
      status: 'Disponible'
    },
    {
      id: '3',
      name: 'Tubo de Ensayo',
      code: 'TE-45',
      category: 'Vidrieria',
      location: 'Estante B',
      stock: 120,
      status: 'Disponible'
    },
    {
      id: '4',
      name: 'Reactivo HCl',
      code: 'R-HCl-02',
      category: 'Químicos',
      location: 'Almacén Central',
      stock: 0,
      status: 'Agotado'
    },
    {
      id: '5',
      name: 'Centrifugadora',
      code: 'CF-99',
      category: 'Equipos',
      location: 'Laboratorio 3',
      stock: 1,
      status: 'En Mantenimiento'
    }
  ]);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Disponible': return 'badge-success';
      case 'Agotado': return 'badge-danger';
      case 'En Mantenimiento': return 'badge-warning';
      default: return '';
    }
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este item del inventario?')) {
      // Aquí se llamaría a la API en el futuro
      // setItem(items.filter(item => item.id !== id));
      setActiveMenu(null);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inventario-container">
      <div className="inventario-header">
        <h2 className="inventario-title">Inventario</h2>
        <button className="btn-add-item" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>Item</span>
        </button>
      </div>

      <div className="inventario-controls">
        <div className="search-inventory">
          <Search className="search-inventory-icon" size={18} />
          <input 
            type="text" 
            placeholder="Buscar en el Inventario" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select className="filter-select">
          <option value="">Categoría</option>
          <option value="vidrieria">Vidriería</option>
          <option value="equipos">Equipos</option>
          <option value="quimicos">Químicos</option>
        </select>

        <select className="filter-select">
          <option value="">Ubicación</option>
          <option value="estante">Estante</option>
          <option value="laboratorio">Laboratorio</option>
          <option value="almacen">Almacén</option>
        </select>

        <select className="filter-select">
          <option value="">Estado</option>
          <option value="disponible">Disponible</option>
          <option value="agotado">Agotado</option>
          <option value="mantenimiento">Mantenimiento</option>
        </select>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Categoría</th>
              <th>Laboratorio / Ubicación</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="item-cell">
                    <div className="item-image">
                      {item.image ? <img src={item.image} alt={item.name} /> : <Package size={24} />}
                    </div>
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-code">Código: {item.code}</span>
                    </div>
                  </div>
                </td>
                <td>{item.category}</td>
                <td>{item.location}</td>
                <td>{item.stock}</td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <div className="action-menu-container">
                    <button 
                      className="action-button"
                      onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeMenu === item.id && (
                      <div className="actions-dropdown">
                        <button className="dropdown-item" onClick={() => { setShowModal(true); setActiveMenu(null); }}>
                          <Edit2 size={16} />
                          Editar
                        </button>
                        <button className="dropdown-item delete" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL PARA AGREGAR/MODIFICAR ITEM */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Agregar/Modificar Item</h2>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                {/* COLUMNA IZQUIERDA */}
                <div className="form-column">
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Nombre del Item</label>
                    <input type="text" placeholder="Ej. Baso de Precipitado" />
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Código Interno</label>
                    <input type="text" placeholder="Ej. INV-001" />
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>N° CAS (Opcional)</label>
                    <input type="text" placeholder="Ej. 7647-01-0" />
                  </div>

                  <div className="form-group">
                    <label>Categoría</label>
                    <select>
                      <option value="">Seleccione</option>
                      <option value="vidrieria">Vidriería</option>
                      <option value="equipos">Equipos</option>
                      <option value="quimicos">Químicos</option>
                    </select>
                    
                    <div className="checkbox-list">
                      <label className="checkbox-item">
                        <input type="checkbox" checked readOnly /> Clase de laboratorio Azul
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked readOnly /> Reserva Verde
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked readOnly /> Reserva Rojo
                      </label>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="form-column">
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Cantidad Inicial</label>
                    <input type="number" placeholder="0" />
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Unidad de Medida</label>
                    <select>
                      <option value="">Ej. ml, g, unidades</option>
                      <option value="unidades">Unidades</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="g">Gramos (g)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Ubicación Física</label>
                    <select>
                      <option value="">Seleccione ubicación</option>
                      <option value="estante_a">Estante A</option>
                      <option value="laboratorio_1">Laboratorio 1</option>
                      <option value="almacen">Almacén Central</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Agregar Imagen</label>
                    <div className="image-upload-zone">
                      <Filter size={32} />
                      <span style={{ fontSize: '12px', marginTop: '8px' }}>Haga clic para subir</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Nota Adicional</label>
                <textarea rows={4} placeholder="Escriba notas adicionales aquí..."></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-save" onClick={() => setShowModal(false)}>Guardar</button>
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
