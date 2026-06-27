import { type LaboratorioResponse } from "../types/laboratorio.types";

const API_URL = "http://localhost:4000/api";

/**
 * Servicio para gestionar las peticiones relacionadas con los laboratorios.
 */
export const laboratoriosService = {
  /**
   * Obtiene la lista de todos los laboratorios activos desde el backend.
   * @returns {Promise<LaboratorioResponse>} Respuesta del servidor con los laboratorios.
   */
  getLaboratorios: async (): Promise<LaboratorioResponse> => {
    try {
      const response = await fetch(`${API_URL}/laboratorios`);
      if (!response.ok) {
        throw new Error("Error al obtener los laboratorios");
      }
      return await response.json();
    } catch (error) {
      console.error("Error en laboratoriosService.getLaboratorios:", error);
      return { success: false, data: [] };
    }
  },
};
