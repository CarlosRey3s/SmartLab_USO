import axios from "axios";
import type { EstudianteDashboard } from "../types/estudianteDashboard.types";
import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/api/estudiante/dashboard`;

const getAuthHeaders = () => {
    const token = localStorage.getItem("uso_token");

    return {
        "Content-Type": "application/json",
        ...(token ? {
            Authorization: `Bearer ${token}`
        } : {})
    };
};


// =====================================================
// OBTENER DASHBOARD DEL ESTUDIANTE

export const obtenerDashboardEstudiante = async (): Promise<EstudianteDashboard> => {
    try {
        const response = await axios.get(
            API_URL,
            {
                headers: getAuthHeaders()
            }
        );
        console.log("Dashboard estudiante recibido:", response.data);
        if (response.data && response.data.data) {
            return response.data.data;
        }
        return response.data;
    } catch (error: any) {
        console.error("Error al obtener dashboard del estudiante:", error);
        if (error.response) {
            console.error("Respuesta del servidor:", error.response.data);
            console.error("Código:", error.response.status);
        }
        throw error;
    }
};