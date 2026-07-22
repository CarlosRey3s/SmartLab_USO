// src/services/actividades.service.ts
import axios from 'axios';
import type { EventoLaboratorio } from '..//pages/admin/Calendario.tsx'; // Ajusta la ruta a donde tengas tu interfaz
// Ajusta la ruta a donde tengas tu interfaz

// Reemplaza esto con la URL real de tu backend si es diferente
const API_URL = "http://localhost:4000/api/actividades"
/*
export const obtenerActividades = async (start: string, end: string) => {
    try {
        const respuesta = await axios.get(API_URL, { params: { start, end } });
        
        // Extraemos con seguridad el array del cuerpo de la respuesta
        const datos = respuesta.data.data || respuesta.data;
        const arregloEventos = Array.isArray(datos) ? datos : [];

        // Mapeamos alineando perfectamente las llaves de PostgreSQL con lo que pide React Big Calendar
        return arregloEventos.map((item: any) => {
            // Evaluamos con un escudo defensor los nombres de campos que vengan del backend
            const fechaInicioRaw = item.fecha_hora_inicio || item.start;
            const fechaFinRaw = item.fecha_hora_fin || item.end;

            return {
                id: item.id_instancia || item.id, // Instancia única calculada por el motor RRULE
                idOriginal: item.id, // Llave primaria real para base de datos
                
                // Si es tipo clase usa la materia, si es reserva usa el título, si no un genérico
                title: item.tipo === 'clase' 
                    ? (item.materia || 'Clase Académica') 
                    : item.tipo === 'mantenimiento' 
                        ? 'Cierre Técnico' 
                        : (item.titulo || 'Reserva Directa'),

                // Forzamos la conversión limpia a objetos de fecha reales
                start: new Date(fechaInicioRaw),
                end: new Date(fechaFinRaw),
                
                tipo: item.tipo,

                // Infraestructura
                laboratorio_id: item.laboratorio_id,
                laboratorio_nombre: item.laboratorio_nombre || 'Laboratorio',
                coordinador_id: item.coordinador_id,

                // Extensiones de la tabla hija: Clases
                materia: item.materia,
                docente_id: item.docente_id,
                docente_nombre: item.docente_nombre || 'No asignado',
                clase_estudiantes: item.num_estudiantes || item.clase_estudiante,

                // Extensiones de la tabla hija: Mantenimientos
                tecnico_responsable: item.tecnico_id || item.tecnico_responsable,
                tecnico_nombre: item.tecnico_nombre || 'No asignado',
                mant_descripcion: item.descripcion_ti || item.mant_descripcion,

                // Extensiones de la tabla hija: Reservas Directas
                reserva_titulo: item.titulo || item.reserva_titulo,
                reserva_nota: item.nota_adicional || item.reserva_nota,
                estado_reserva: item.estado_reserva || 'aprobada',
                usuario_id: item.usuario_id || item.id_solicitante,
                estaciones: item.estaciones || [],
                equipos: item.equipos || [],
            };
        });
    } catch (error) {
        console.error("Error crítico al obtener y formatear actividades:", error);
        return [];
    }
};
*/
export const obtenerActividades = async (start: string, end: string) => {
    try {
        // Hacemos la petición directa al puerto 4000 de tu backend
        const respuesta = await axios.get(API_URL, { params: { start, end } });
        
        // Retornamos el arreglo crudo directamente del backend
        return respuesta.data.data || respuesta.data;
    } catch (error) {
        console.error("Error al obtener actividades en el servicio:", error);
        return [];
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

// Añade esta función en tu servicio del frontend
export const chequearDisponibilidad = async (laboratorio_id: number, fecha: string, hora_inicio: string, hora_fin: string, exclude_id?: number) => {
    try {
        let url = `http://localhost:4000/api/actividades/disponibilidad?laboratorio_id=${laboratorio_id}&fecha=${fecha}&hora_inicio=${hora_inicio}&hora_fin=${hora_fin}`;
        if (exclude_id) url += `&exclude_id=${exclude_id}`;

        const response = await axios.get(url);
        return response.data.data; // Retorna { bloqueoTotal: boolean, estacionesOcupadas: number[] }
    } catch (error) {
        console.error("Error chequeando disponibilidad", error);
        return { bloqueoTotal: false, estacionesOcupadas: [] };
    }
};

// Función para consultar el inventario disponible en tiempo real al backend
export const obtenerInventarioDisponible = async (
    laboratorioId: string | number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    excludeActividadId?: string | number
) => {
    try {
        let url = `http://localhost:4000/api/inventario/disponibilidad?laboratorio_id=${laboratorioId}&fecha=${fecha}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`;

        // Si estamos editando una actividad, pasamos su ID para no restarnos nuestro propio stock
        if (excludeActividadId) {
            url += `&exclude_actividad_id=${excludeActividadId}`;
        }

        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error al obtener el inventario disponible:", error);
        throw error;
    }
};