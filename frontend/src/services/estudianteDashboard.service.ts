import axios from "axios";

import type {
    EstudianteDashboard
} from "../types/estudianteDashboard.types";

import {
    BASE_URL
} from "../config/api";

const API_URL = `${BASE_URL}/api/estudiante/dashboard`;

export const obtenerDashboardEstudiante = async (): Promise<EstudianteDashboard> => {

    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("No existe un token de autenticación.");
    }

    const response = await axios.get<EstudianteDashboard>(
        API_URL,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;
};