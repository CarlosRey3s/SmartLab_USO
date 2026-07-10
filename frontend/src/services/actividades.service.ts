// src/services/actividades.service.ts
import axios from 'axios';
import type { EventoLaboratorio } from '..//pages/admin/Calendario.tsx'; // Ajusta la ruta a donde tengas tu interfaz
// Ajusta la ruta a donde tengas tu interfaz

// Reemplaza esto con la URL real de tu backend si es diferente
const API_URL = "http://localhost:4000/api/actividades"

export const obtenerActividades = async (): Promise<EventoLaboratorio[]> => {
    try {
        const respuesta = await axios.get(API_URL);

        // 1. Imprimimos en consola exactamente lo que mandó el backend
        console.log("Respuesta cruda del backend:", respuesta.data);

        // 2. Ajustamos la ruta. Si tu JSON viene envuelto en una propiedad "data", 
        // debes usar respuesta.data.data. Si se llama "actividades", usa respuesta.data.actividades.

        // CAMBIA ESTA LÍNEA basándote en lo que veas en la consola:
        const datos = respuesta.data.data; // <-- Si es un array directo
        // const datos = respuesta.data.data; <-- Si viene envuelto en "data"

        // Transformamos los datos del backend al formato del calendario
        return datos.map((item: any) => {
            let nombreLaboratorio = 'Laboratorio Desconocido';
            if (item.laboratorio_id === 1) nombreLaboratorio = 'Lab de Redes';
            if (item.laboratorio_id === 2) nombreLaboratorio = 'Lab de Computo';

            return {
                ...item,
                start: new Date(item.start),
                end: new Date(item.end),
                laboratorio: nombreLaboratorio
            };
        });
    } catch (error) {
        console.error('Error al obtener las actividades desde el backend:', error);
        throw error;
    }
};

export const crearActividad = async (datosModal: any): Promise<any> => {
    try {
        const respuesta = await axios.post(API_URL, datosModal, {
            // Cuando agregues tokens JWT, pasar los headers aquí
            headers: { 'Content-Type': 'application/json' }
        });
        return respuesta.data;
    } catch (error: any) {
        console.error('Error al crear la actividad en el backend:', error);
        if (error.response && error.response.data && error.response.data.error) {
            throw new Error(error.response.data.error);
        } else if (error.response && error.response.data && error.response.data.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Error de conexión con el servidor. Por favor, inténtalo de nuevo más tarde.');
    }
};

export const actualizarActividad = async (idActividad: number | string, datosModal: any): Promise<any> => {
    try {
        const respuesta = await axios.put(`${API_URL}/${idActividad}`, datosModal, {
            headers: { 'Content-Type': 'application/json' }
        });
        return respuesta.data;
    } catch (error: any) {
        console.error(`Error al actualizar la actividad ${idActividad} en el backend:`, error); if (error.response && error.response.data && error.response.data.error) {
            throw new Error(error.response.data.error);
        } else if (error.response && error.response.data && error.response.data.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Error de conexión con el servidor. Por favor, inténtalo de nuevo más tarde.');
    }
}

export const eliminarActividad = async (idActividad: number | string): Promise<any> => {
    try {
        const respuesta = await axios.delete(`${API_URL}/${idActividad}`, {
            headers: { 'Content-Type': 'application/json' }
        });
        return respuesta.data;
    } catch (error: any) {
        console.error(`Error al eliminar la actividad ${idActividad} en el backend:`, error); if (error.response && error.response.data && error.response.data.error) {
            throw new Error(error.response.data.error);
        } else if (error.response && error.response.data && error.response.data.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Error de conexión con el servidor. Por favor, inténtalo de nuevo más tarde.');
    }
}