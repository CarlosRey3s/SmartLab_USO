// src/services/usuarios.service.ts
const API_URL = 'http://localhost:4000/api';

export const usuariosService = {
  getUsuarios: async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, message: 'Error de conexión' };
    }
  },

  crearUsuario: async (userData: any) => {
    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

  actualizarUsuario: async (id: number, userData: any) => {
    try {
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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

  eliminarUsuario: async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }
};
