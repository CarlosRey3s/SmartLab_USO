import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Edit3,
  Shield,
  Edit2,
  X
} from 'lucide-react';
import '../../css/Usuarios.css';

// Mock data basada en la imagen
const initialMockUsers = [
  {
    id: 1,
    name: 'Salvador De Asis',
    email: 'salvador@usonsonate.edu.sv',
    role: 'Admin',
    status: 'Activo',
    lastAccess: 'Hace 2 h'
  },
  {
    id: 2,
    name: 'Juan Perez',
    email: 'juan@usonsonate.edu.sv',
    role: 'Admin',
    status: 'Activo',
    lastAccess: 'Hace 2 h'
  }
];

export default function Usuarios() {
  const [users, setUsers] = useState(initialMockUsers);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([2]);
  const [activeTab, setActiveTab] = useState('Todos');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const toggleUser = (id: number) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  return (
    <div className="usuarios-container">
      {/* Tarjetas Superiores */}
      <div className="top-cards-wrapper">
        <div className="metric-card">
          <div className="card-icon-container">
            <Users size={32} />
          </div>
          <div className="card-text">
            <span className="card-title">Total Usuarios:</span>
            <span className="card-number">3</span>
          </div>
        </div>

        <div className="metric-card active-users">
          <div className="card-icon-container">
            <UserCheck size={32} />
          </div>
          <div className="card-text">
            <span className="card-title">Usuarios Activos</span>
            <span className="card-number">2</span>
          </div>
        </div>

        <button className="add-user-btn" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} /> Agregar usuario
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="filters-section">
        <div className="tabs-container">
          {['Todos', 'Administradores', 'coordinador'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="search-container-users">
          <Search size={16} color="#6b7280" />
          <input type="text" placeholder="Buscar usuarios" />
        </div>
      </div>

      {/* Acciones en lote */}
      <div className="bulk-actions-bar">
        <button className="bulk-btn">
          <Trash2 size={14} /> Papelera
        </button>
        <button 
          className={`bulk-btn ${isRoleModalOpen ? 'active' : ''}`}
          onClick={() => setIsRoleModalOpen(!isRoleModalOpen)}
        >
          <RefreshCw size={14} /> Cambiar Rol
        </button>

        {isRoleModalOpen && (
          <div className="role-popover">
            <div className="role-popover-title">Seleccione el nuevo Rol</div>
            <div className="role-options">
              <div 
                className={`role-option ${selectedNewRole === 'Administrador' ? 'selected' : ''}`}
                onClick={() => setSelectedNewRole('Administrador')}
              >
                <Shield size={16} className="role-option-icon" />
                <span className="role-option-text">Administrador</span>
              </div>
              <div 
                className={`role-option ${selectedNewRole === 'Coordinador' ? 'selected' : ''}`}
                onClick={() => setSelectedNewRole('Coordinador')}
              >
                <Edit2 size={16} className="role-option-icon" />
                <span className="role-option-text">Coordinador</span>
              </div>
              <div 
                className={`role-option ${selectedNewRole === 'Instructor' ? 'selected' : ''}`}
                onClick={() => setSelectedNewRole('Instructor')}
              >
                <Users size={16} className="role-option-icon" />
                <span className="role-option-text">Instructor</span>
              </div>
            </div>
            <div className="role-popover-actions">
              <button 
                className="role-btn-confirm"
                onClick={() => {
                  if (selectedNewRole && selectedUsers.length > 0) {
                    const updatedUsers = users.map(user => {
                      if (selectedUsers.includes(user.id)) {
                        return { ...user, role: selectedNewRole };
                      }
                        return user;
                    });
                    setUsers(updatedUsers);
                  }
                  setIsRoleModalOpen(false);
                }}
              >
                Confirmar
              </button>
              <button 
                className="role-btn-cancel"
                onClick={() => setIsRoleModalOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {selectedUsers.length > 0 && (
          <div className="selected-info">
            {selectedUsers.length} Usuario{selectedUsers.length !== 1 ? 's' : ''} Seleccionado{selectedUsers.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={selectedUsers.length === users.length && users.length > 0}
                />
              </th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol Actual</th>
              <th>Estado</th>
              <th>Ultimo Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                  />
                </td>
                <td>
                  <div className="name-cell">
                    <div className="avatar-circle">
                      {/* Avatar placeholder */}
                    </div>
                    <span className="name-text">{user.name}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className="status-badge">{user.status}</span>
                </td>
                <td>{user.lastAccess}</td>
                <td>
                  <div className="actions-cell">
                    <button className="action-icon-btn edit">
                      <Edit3 size={16} />
                    </button>
                    <button className="action-icon-btn delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Agregar Usuario */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
              <X size={24} />
            </button>
            
            <h2 className="modal-title">Agregar Usuario</h2>
            <p className="modal-subtitle">Ingresa la informacion del Usuario</p>
            
            <div className="form-section-title">INFORMACION GENERAL</div>
            
            <div className="form-group">
              <label className="form-label">NOMBRE COMPLETO</label>
              <input type="text" className="form-input" />
            </div>
            
            <div className="form-group">
              <label className="form-label">CORREO ELECTRONICO</label>
              <input type="email" className="form-input" />
            </div>
            
            <div className="form-group">
              <label className="form-label">CONTRASEÑA</label>
              <input type="password" className="form-input" />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ESTADO DE LA CUENTA</label>
                <select className="form-select" defaultValue="">
                  <option value="" disabled>Seleccione un Estado</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">SELECCIONAR ROL</label>
                <select className="form-select" defaultValue="">
                  <option value="" disabled>Seleccione un Rol</option>
                  <option value="Admin">Admin</option>
                  <option value="Coordinador">Coordinador</option>
                  <option value="Instructor">Instructor</option>
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <span className="modal-footer-text">Los campos marcados son obligatorios.</span>
              <div className="modal-actions">
                <button className="btn-modal-cancel" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </button>
                <button className="btn-modal-save" onClick={() => setIsAddModalOpen(false)}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
