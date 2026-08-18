import axios from "axios";
import type { DocenteDashboard } from "../types/docenteDashboard.types";
import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/api/docente/dashboard`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('uso_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const obtenerDashboardDocente = async (): Promise<DocenteDashboard> => {
    const response = await axios.get(API_URL, {
        headers: getAuthHeaders()
    });
    return response.data;
};