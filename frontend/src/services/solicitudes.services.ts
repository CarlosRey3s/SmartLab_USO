// src/services/solicitudes.service.ts
import axios from 'axios';
import type { SolicitudPendiente } from '../types/solicitudes.types';

// Ajusta esto si usas variables de entorno como import.meta.env.VITE_API_URL
const API_URL = 'http://localhost:4000/api/actividades/solicitudes';

// Helper para enviar el token
const getConfig = () => {
    const token = localStorage.getItem('uso_token');
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

export const obtenerSolicitudesPendientes = async (): Promise<SolicitudPendiente[]> => {
    const response = await axios.get(`${API_URL}/pendientes`, getConfig());
    return response.data;
};

export const obtenerTodasSolicitudes = async (): Promise<SolicitudPendiente[]> => {
    const response = await axios.get(`${API_URL}/todas`, getConfig());
    return response.data;
};

export const resolverSolicitud = async (actividadId: number, accion: 'aprobar' | 'rechazar') => {
    const response = await axios.put(`${API_URL}/${actividadId}/resolver`, { accion }, getConfig());
    return response.data;
};