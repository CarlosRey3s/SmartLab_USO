const API_URL = "http://localhost:4000/api";

export const inventarioService = {
  /**
   * Crea un nuevo ítem en el inventario.
   */
  crearItem: async (itemData: any): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/inventario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al crear el ítem");
      }

      return data;
    } catch (error) {
      console.error("Error en inventarioService.crearItem:", error);
      throw error;
    }
  },

  /**
   * Obtiene la lista completa del inventario
   */
  getInventario: async (): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/inventario`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener inventario");
      }
      
      return data;
    } catch (error) {
      console.error("Error en inventarioService.getInventario:", error);
      return { status: "error", data: [] };
    }
  },

  /**
   * Actualiza un ítem existente en el inventario.
   */
  actualizarItem: async (id: string | number, itemData: any): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/inventario/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar el ítem");
      }

      return data;
    } catch (error) {
      console.error("Error en inventarioService.actualizarItem:", error);
      throw error;
    }
  },

  /**
   * Elimina un ítem del inventario.
   */
  eliminarItem: async (id: string | number): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/inventario/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al eliminar el ítem");
      }

      return data;
    } catch (error) {
      console.error("Error en inventarioService.eliminarItem:", error);
      throw error;
    }
  }
};
