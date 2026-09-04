import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/api`;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('uso_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const usuariosService = {
  getUsuarios: async (usuarioId: string = '1') => {
    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        headers: {
          'usuario-id': usuarioId,
          ...getAuthHeaders()
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, message: 'Error de conexión' };
    }
  },

  crearUsuario: async (userData: any, usuarioId: string = '1') => {
    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'usuario-id': usuarioId,
          ...getAuthHeaders()
        },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, message: 'Error de conexión' };
    }
  },

  actualizarUsuario: async (id: number, userData: any, usuarioId: string = '1') => {
    try {
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'usuario-id': usuarioId,
          ...getAuthHeaders()
        },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, message: 'Error de conexión' };
    }
  },

  eliminarUsuario: async (id: number, usuarioId: string = '1') => {
    try {
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
          'usuario-id': usuarioId,
          ...getAuthHeaders()
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }
};
