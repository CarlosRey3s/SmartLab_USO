import axios from "axios";
import type {   EstudianteDashboard} from "../types/estudianteDashboard.types";
import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/api/estudiante/dashboard`;

export const obtenerDashboardEstudiante =
async (): Promise<EstudianteDashboard> => {
    const response =
    await axios.get(
        API_URL
    );
    return response.data;
};