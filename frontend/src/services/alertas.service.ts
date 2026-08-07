const API_URL = "http://localhost:4000/api/alertas";

// Helper para enviar el token
const getHeaders = () => {
  const token = localStorage.getItem('uso_token');
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const alertasService = {
  /**
   * Obtiene todas las alertas del inventario
   */
  getAlertas: async () => {
    try {
      const response = await fetch(API_URL, {
        headers: getHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error("Error en getAlertas:", error);
      return { status: 'error', data: [] };
    }
  },

  /**
   * Crea una nueva alerta manual (daño, extravío, otro)
   */
  crearAlerta: async (alertaData: any) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(alertaData)
      });
      return await response.json();
    } catch (error) {
      console.error("Error en crearAlerta:", error);
      return { status: 'error', message: "Error al comunicarse con el servidor" };
    }
  },

  /**
   * Actualiza el estado de una alerta
   */
  updateAlertaStatus: async (id: number | string, estado: string) => {
    try {
      const response = await fetch(`${API_URL}/${id}/estado`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ estado })
      });
      return await response.json();
    } catch (error) {
      console.error("Error en updateAlertaStatus:", error);
      return { status: 'error', message: "Error de red al conectar con el servidor" };
    }
  }
};
