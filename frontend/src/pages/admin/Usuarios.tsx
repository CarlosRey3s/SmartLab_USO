import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Shield,
  Edit2,
  X,
  Filter
} from 'lucide-react';
import '../../css/Usuarios.css';
import { usuariosService } from '../../services/usuarios.service';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
import { useAuth } from '../../context/AuthContext';
import { isReadOnlyView } from '../../utils/roleGuard';

export default function Usuarios() {
  const { user } = useAuth();
  const readOnly = user ? isReadOnlyView(user.rol as any) : false;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('Todos'); // This will now represent the selected role in the dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{title: string, message: string, action: () => void} | null>(null);
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

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    const data = await usuariosService.getUsuarios(String(user?.id || 1));
    if (data.status === 'success') {
      setUsers(data.data);
    }
    setLoading(false);
  };

  const handleGuardarUsuario = async () => {
    // Si estamos creando, la contraseña es obligatoria. Si estamos editando, es opcional.
    if(!formData.nombre || !formData.apellido || !formData.correo || !formData.rol || !formData.expediente || (!editingUserId && !formData.password)) {
      customToast.error("Por favor llena todos los campos obligatorios.");
      return;
    }

    // Validación de longitud mínima de contraseña
    if (formData.password && formData.password.length < 6) {
      customToast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    let dbRole = formData.rol;
    // Mapeo inverso de roles solo si viene del select con los nombres amigables
    if(formData.rol === 'Admin') dbRole = 'administrador';
    if(formData.rol === 'Coordinador') dbRole = 'coordinador';
    if(formData.rol === 'Instructor') dbRole = 'docente';
    if(formData.rol === 'Estudiante') dbRole = 'estudiante';
    if(formData.rol === 'Supervisor') dbRole = 'supervisor';

    const payload = { ...formData, rol: dbRole };
    
    let result;
    if (editingUserId) {
      result = await usuariosService.actualizarUsuario(editingUserId, payload, String(user?.id || 1));
    } else {
      result = await usuariosService.crearUsuario(payload, String(user?.id || 1));
    }

    if(result.status === 'success') {
      customToast.success(`Usuario ${editingUserId ? 'actualizado' : 'creado'} correctamente`);
      setIsAddModalOpen(false);
      setEditingUserId(null);
      setFormData({ nombre: '', apellido: '', expediente: '', correo: '', password: '', rol: '', estado: 'activo' });
      cargarUsuarios();
    } else {
      customToast.error("Error: " + result.message);
    }
  };

  const handleEliminar = async (id: number) => {
    setConfirmModalData({
      title: 'Eliminar Usuario',
      message: '¿Estás seguro de que deseas eliminar este usuario de forma permanente?',
      action: async () => {
        const result = await usuariosService.eliminarUsuario(id, String(user?.id || 1));
        if (result.status === 'success') {
          customToast.success("Usuario eliminado correctamente");
          cargarUsuarios();
        } else {
          customToast.error("Error al eliminar el usuario");
        }
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleAbrirEdicion = (user: any) => {
    let selectRole = user.rol;
    if(user.rol === 'administrador') selectRole = 'Admin';
    if(user.rol === 'coordinador') selectRole = 'Coordinador';
    if(user.rol === 'docente') selectRole = 'Instructor';
    if(user.rol === 'estudiante') selectRole = 'Estudiante';
    if(user.rol === 'supervisor') selectRole = 'Supervisor';

    setFormData({
      nombre: user.nombre,
      apellido: user.apellido,
      expediente: user.expediente || '',
      correo: user.correo,
      password: '',
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

  const filteredUsers = users.filter(user => {
    const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.toLowerCase();
    const correo = (user.correo || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = nombreCompleto.includes(searchLower) || correo.includes(searchLower);
    
    if (activeTab === 'Todos') return matchesSearch;
    return matchesSearch && (user.rol || '').toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="usuarios-container">
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

      <div className="filters-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative' }} ref={filterRef}>
          <button 
            className="btn-filter" 
            style={{ borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' }}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={16} />
            <span>Filtros</span>
          </button>

          {isFilterOpen && (
            <div className="filter-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '250px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Filtros</span>
                <button 
                  onClick={() => { setActiveTab('Todos'); setIsFilterOpen(false); }}
                  style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Limpiar
                </button>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Por Rol de Usuario</label>
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                >
                  <option value="Todos">Todos</option>
                  <option value="administrador">Administrador</option>
                  <option value="coordinador">Coordinador</option>
                  <option value="docente">Docente</option>
                  <option value="estudiante">Estudiante</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="search-container-users">
          <Search size={16} color="#6b7280" />
          <input 
            type="text" 
            placeholder="Buscar usuarios..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bulk-actions-bar">
        <button className="bulk-btn" onClick={() => {
          if (selectedUsers.length === 0) return;
          setConfirmModalData({
            title: 'Eliminar Usuarios',
            message: `¿Estás seguro de eliminar ${selectedUsers.length} usuarios de forma permanente?`,
            action: async () => {
              const deletePromises = selectedUsers.map(id => usuariosService.eliminarUsuario(id, String(user?.id || 1)));
              await Promise.all(deletePromises);
              customToast.success("Usuarios eliminados correctamente");
              cargarUsuarios();
              setSelectedUsers([]);
              setIsConfirmModalOpen(false);
            }
          });
          setIsConfirmModalOpen(true);
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
              <div 
                className={`role-option ${selectedNewRole === 'Supervisor' ? 'selected' : ''}`}
                onClick={() => setSelectedNewRole('Supervisor')}
              >
                <Shield size={16} className="role-option-icon" />
                <span className="role-option-text">Supervisor</span>
              </div>
            </div>
            <div className="role-popover-actions">
              <button 
                className="role-btn-confirm"
                onClick={async () => {
                  if (selectedNewRole && selectedUsers.length > 0) {
                    let dbRole = 'estudiante';
                    if(selectedNewRole === 'Administrador') dbRole = 'administrador';
                    if(selectedNewRole === 'Coordinador') dbRole = 'coordinador';
                    if(selectedNewRole === 'Instructor') dbRole = 'docente';
                    if(selectedNewRole === 'Estudiante') dbRole = 'estudiante';
                    if(selectedNewRole === 'Supervisor') dbRole = 'supervisor';

                    const updatePromises = selectedUsers.map(id => {
                      const userObj = users.find(u => u.id === id);
                      if (userObj) {
                        return usuariosService.actualizarUsuario(id, { ...userObj, rol: dbRole }, String(user?.id || 1));
                      }
                      return Promise.resolve();
                    });

                    await Promise.all(updatePromises);
                    customToast.success("Roles actualizados correctamente");
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

      {/* Vista Desktop: Tabla */}
      <div className="table-container desktop-only">
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
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No hay usuarios que coincidan con la búsqueda</td></tr>
            ) : (
              filteredUsers.map(user => (
              <tr key={user.id}>
                <td data-label="Seleccionar">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                  />
                </td>
                <td data-label="Nombre">
                  <div className="name-cell">
                    <div className="avatar-circle">
                      {`${(user.nombre || '').charAt(0).toUpperCase()}${(user.apellido || '').charAt(0).toUpperCase()}`}
                    </div>
                    <span className="name-text">{user.nombre} {user.apellido}</span>
                  </div>
                </td>
                <td data-label="Correo">{user.correo}</td>
                <td data-label="Rol Actual">{user.rol}</td>
                <td data-label="Estado">
                  <span className="status-badge">{user.estado}</span>
                </td>
                <td data-label="Ultimo Acceso">{user.fecha_creacion ? new Date(user.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
                <td data-label="Acciones">
                  {!readOnly && (
                  <div className="actions-cell">
                    <button className="action-icon-btn edit" onClick={() => handleAbrirEdicion(user)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="action-icon-btn delete" onClick={() => handleEliminar(user.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  )}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vista Móvil: Tarjetas Nativas */}
      <div className="mobile-users-cards mobile-only">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay usuarios que coincidan con la búsqueda</div>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} className="user-card-mobile">
              <div className="user-card-header">
                <div className="user-card-info">
                  <div className="avatar-circle">
                    {`${(user.nombre || '').charAt(0).toUpperCase()}${(user.apellido || '').charAt(0).toUpperCase()}`}
                  </div>
                  <div>
                    <div className="user-card-name">{user.nombre} {user.apellido}</div>
                    <div className="user-card-email">{user.correo}</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                />
              </div>

              <div className="user-card-body">
                <div className="user-card-row">
                  <span className="user-card-label">Rol:</span>
                  <span className="user-card-val">{user.rol}</span>
                </div>
                <div className="user-card-row">
                  <span className="user-card-label">Estado:</span>
                  <span className="status-badge">{user.estado}</span>
                </div>
                <div className="user-card-row">
                  <span className="user-card-label">Último Acceso:</span>
                  <span className="user-card-val">{user.fecha_creacion ? new Date(user.fecha_creacion).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {!readOnly && (
                <div className="user-card-actions">
                  <button className="action-icon-btn edit" onClick={() => handleAbrirEdicion(user)}>
                    <Edit2 size={16} /> Editar
                  </button>
                  <button className="action-icon-btn delete" onClick={() => handleEliminar(user.id)}>
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
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
              <input type="text" className="form-input" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej. Juan Carlos" />
            </div>

            <div className="form-group">
              <label className="form-label">APELLIDOS</label>
              <input type="text" className="form-input" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} placeholder="Ej. Pérez Gómez" />
            </div>

            <div className="form-group">
              <label className="form-label">EXPEDIENTE</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.expediente} 
                onChange={e => {
                  const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({...formData, expediente: onlyNums});
                }}
                placeholder="Ej. 123456" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">CORREO ELECTRONICO</label>
              <input type="email" className="form-input" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} placeholder="Ej. usuario@ejemplo.com" />
            </div>
            
            <div className="form-group">
              <label className="form-label">CONTRASEÑA</label>
              <input type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Mínimo 8 caracteres" />
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
                  <option value="Supervisor">Supervisor</option>
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

      {isConfirmModalOpen && confirmModalData && (
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          title={confirmModalData.title}
          message={confirmModalData.message}
          onConfirm={confirmModalData.action}
          onCancel={() => setIsConfirmModalOpen(false)}
        />
      )}
    </div>
  );
}
