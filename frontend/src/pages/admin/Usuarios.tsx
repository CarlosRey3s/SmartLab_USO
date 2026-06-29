import React, { useState, useEffect } from 'react';
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
import { usuariosService } from '../../services/usuarios.service';

export default function Usuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([2]);
  const [activeTab, setActiveTab] = useState('Todos');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    expediente: '',
    correo: '',
    password: '',
    rol: '',
    estado: 'activo'
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    const data = await usuariosService.getUsuarios();
    if (data.status === 'success') {
      setUsers(data.data);
    }
    setLoading(false);
  };

  const handleGuardarUsuario = async () => {
    // Si estamos creando, la contraseña es obligatoria. Si estamos editando, es opcional.
    if(!formData.nombre || !formData.apellido || !formData.correo || !formData.rol || !formData.expediente || (!editingUserId && !formData.password)) {
      alert("Por favor llena todos los campos obligatorios.");
      return;
    }

    let dbRole = formData.rol;
    // Mapeo inverso de roles solo si viene del select con los nombres amigables
    if(formData.rol === 'Admin') dbRole = 'administrador';
    if(formData.rol === 'Coordinador') dbRole = 'coordinador';
    if(formData.rol === 'Instructor') dbRole = 'docente';
    if(formData.rol === 'Estudiante') dbRole = 'estudiante';

    const payload = { ...formData, rol: dbRole };
    
    let result;
    if (editingUserId) {
      result = await usuariosService.actualizarUsuario(editingUserId, payload);
    } else {
      result = await usuariosService.crearUsuario(payload);
    }

    if(result.status === 'success') {
      alert(`Usuario ${editingUserId ? 'actualizado' : 'creado'} correctamente`);
      setIsAddModalOpen(false);
      setEditingUserId(null);
      setFormData({ nombre: '', apellido: '', expediente: '', correo: '', password: '', rol: '', estado: 'activo' });
      cargarUsuarios();
    } else {
      alert("Error: " + result.message);
    }
  };

  const handleEliminar = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este usuario de forma permanente?")) {
      const result = await usuariosService.eliminarUsuario(id);
      if (result.status === 'success') {
        alert("Usuario eliminado correctamente");
        cargarUsuarios();
      } else {
        alert("Error al eliminar el usuario");
      }
    }
  };

  const handleAbrirEdicion = (user: any) => {
    // Mapeo del rol de la BD al valor del select
    let selectRole = user.rol;
    if(user.rol === 'administrador') selectRole = 'Admin';
    if(user.rol === 'coordinador') selectRole = 'Coordinador';
    if(user.rol === 'docente') selectRole = 'Instructor';
    if(user.rol === 'estudiante') selectRole = 'Estudiante';

    setFormData({
      nombre: user.nombre,
      apellido: user.apellido,
      expediente: user.expediente || '',
      correo: user.correo,
      password: '', // Se deja vacío para no cambiarla a menos que el admin escriba algo
      rol: selectRole,
      estado: user.estado || 'activo'
    });
    setEditingUserId(user.id);
    setIsAddModalOpen(true);
  };

  const handleAbrirCreacion = () => {
    setEditingUserId(null);
    setFormData({ nombre: '', apellido: '', expediente: '', correo: '', password: '', rol: '', estado: 'activo' });
    setIsAddModalOpen(true);
  };

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
            <span className="card-number">{users.length}</span>
          </div>
        </div>

        <div className="metric-card active-users">
          <div className="card-icon-container">
            <UserCheck size={32} />
          </div>
          <div className="card-text">
            <span className="card-title">Usuarios Activos</span>
            <span className="card-number">{users.filter(u => u.estado === 'activo').length}</span>
          </div>
        </div>

        <button className="add-user-btn" onClick={handleAbrirCreacion}>
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
        <button className="bulk-btn" onClick={async () => {
          if (selectedUsers.length === 0) return;
          if (window.confirm(`¿Estás seguro de eliminar ${selectedUsers.length} usuarios de forma permanente?`)) {
            const deletePromises = selectedUsers.map(id => usuariosService.eliminarUsuario(id));
            await Promise.all(deletePromises);
            alert("Usuarios eliminados correctamente");
            cargarUsuarios();
            setSelectedUsers([]);
          }
        }}>
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
              <div 
                className={`role-option ${selectedNewRole === 'Estudiante' ? 'selected' : ''}`}
                onClick={() => setSelectedNewRole('Estudiante')}
              >
                <UserCheck size={16} className="role-option-icon" />
                <span className="role-option-text">Estudiante</span>
              </div>
            </div>
            <div className="role-popover-actions">
              <button 
                className="role-btn-confirm"
                onClick={async () => {
                  if (selectedNewRole && selectedUsers.length > 0) {
                    // Mapear el rol seleccionado al valor de BD
                    let dbRole = 'estudiante';
                    if(selectedNewRole === 'Administrador') dbRole = 'administrador';
                    if(selectedNewRole === 'Coordinador') dbRole = 'coordinador';
                    if(selectedNewRole === 'Instructor') dbRole = 'docente';
                    if(selectedNewRole === 'Estudiante') dbRole = 'estudiante';

                    // Actualizar cada usuario seleccionado
                    const updatePromises = selectedUsers.map(id => {
                      const user = users.find(u => u.id === id);
                      if (user) {
                        return usuariosService.actualizarUsuario(id, { ...user, rol: dbRole });
                      }
                      return Promise.resolve();
                    });

                    await Promise.all(updatePromises);
                    alert("Roles actualizados correctamente");
                    cargarUsuarios();
                    setSelectedUsers([]);
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
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Cargando usuarios...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No hay usuarios registrados</td></tr>
            ) : (
              users.map(user => (
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
                    <span className="name-text">{user.nombre} {user.apellido}</span>
                  </div>
                </td>
                <td>{user.correo}</td>
                <td>{user.rol}</td>
                <td>
                  <span className="status-badge">{user.estado}</span>
                </td>
                <td>{user.fecha_creacion ? new Date(user.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <div className="actions-cell">
                    <button className="action-icon-btn edit" onClick={() => handleAbrirEdicion(user)}>
                      <Edit3 size={16} />
                    </button>
                    <button className="action-icon-btn delete" onClick={() => handleEliminar(user.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
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
            
            <h2 className="modal-title">{editingUserId ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
            <p className="modal-subtitle">{editingUserId ? 'Modifica la información del Usuario' : 'Ingresa la informacion del Usuario'}</p>
            
            <div className="form-section-title">INFORMACION GENERAL</div>
            
            <div className="form-group">
              <label className="form-label">NOMBRES</label>
              <input type="text" className="form-input" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">APELLIDOS</label>
              <input type="text" className="form-input" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">EXPEDIENTE</label>
              <input type="text" className="form-input" value={formData.expediente} onChange={e => setFormData({...formData, expediente: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label className="form-label">CORREO ELECTRONICO</label>
              <input type="email" className="form-input" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label className="form-label">CONTRASEÑA</label>
              <input type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ESTADO DE LA CUENTA</label>
                <select className="form-select" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">SELECCIONAR ROL</label>
                <select className="form-select" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                  <option value="" disabled>Seleccione un Rol</option>
                  <option value="Admin">Admin</option>
                  <option value="Coordinador">Coordinador</option>
                  <option value="Instructor">Instructor</option>
                  <option value="Estudiante">Estudiante</option>
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <span className="modal-footer-text">Los campos marcados son obligatorios.</span>
              <div className="modal-actions">
                <button className="btn-modal-cancel" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </button>
                <button className="btn-modal-save" onClick={handleGuardarUsuario}>
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
