const API_URL = "http://localhost:4000/api";

export const laboratoriosService = {
  getLaboratorios: async () => {
    try {
      const response = await fetch(`${API_URL}/laboratorios`);
      return await response.json();
    } catch (error) {
      console.error("Error en getLaboratorios:", error);
      return { status: 'error', data: [] };
    }
  },

  createLaboratorio: async (data: any) => {
    const response = await fetch(`${API_URL}/laboratorios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  updateLaboratorio: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/laboratorios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  deleteLaboratorio: async (id: string) => {
    const response = await fetch(`${API_URL}/laboratorios/${id}`, {
      method: 'DELETE'
    });
    return await response.json();
  },

  getEstaciones: async (laboratorioId: string) => {
    const response = await fetch(`${API_URL}/laboratorios/${laboratorioId}/estaciones`);
    return await response.json();
  },

  agregarEstaciones: async (laboratorioId: string, estaciones: any[]) => {
    const response = await fetch(`${API_URL}/laboratorios/${laboratorioId}/estaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estaciones })
    });
    return await response.json();
  },

  updateEstacion: async (estacionId: string, data: any) => {
    const response = await fetch(`${API_URL}/laboratorios/estacion/${estacionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  deleteEstacion: async (estacionId: string) => {
    const response = await fetch(`${API_URL}/laboratorios/estacion/${estacionId}`, {
      method: 'DELETE'
    });
    return await response.json();
  }
};
