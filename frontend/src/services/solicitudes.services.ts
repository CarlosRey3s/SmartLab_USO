// src/services/solicitudes.service.ts
import axios from 'axios';
import type { SolicitudesResponse } from '../types/solicitudes.types';
import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/api/actividades/solicitudes`;

// Helper para enviar el token
const getConfig = () => {
    const token = localStorage.getItem('uso_token');
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

export const obtenerTodasSolicitudes = async (
    estado?: string, page: number = 1, limit: number = 10
): Promise<SolicitudesResponse> => {
    const params = new URLSearchParams();
    if (estado) params.append('estado', estado);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('_t', new Date().getTime().toString());

    const response = await axios.get(`${API_URL}/todas?${params.toString()}`, getConfig());
    return response.data;
};

export const resolverSolicitud = async (actividadId: number, accion: 'aprobar' | 'rechazar', motivo_resolucion?: string) => {
    const response = await axios.put(`${API_URL}/${actividadId}/resolver`, { accion, motivo_resolucion }, getConfig());
    return response.data;
};

export const cancelarSolicitud = async (actividadId: number) => {
    const response = await axios.put(`${API_URL}/${actividadId}/cancelar`, {}, getConfig());
    return response.data;
};

export const reprogramarSolicitud = async (
    actividadId: number,
    fecha: string,
    hora_inicio: string,
    hora_fin: string
) => {
    const response = await axios.put(
        `${API_URL}/${actividadId}/reprogramar`,
        { fecha, hora_inicio, hora_fin },
        getConfig()
    );
    return response.data;
};

export const marcarAusente = async (actividadId: number) => {
    const response = await axios.put(`${API_URL}/${actividadId}/ausente`, {}, getConfig());
    return response.data;
};