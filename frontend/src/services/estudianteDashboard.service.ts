import axios from "axios";

import type {
    EstudianteDashboard
} from "../types/estudianteDashboard.types";



const API_URL =
"http://localhost:4000/api/estudiante/dashboard";



export const obtenerDashboardEstudiante =
async (): Promise<EstudianteDashboard> => {


    const response =
    await axios.get(
        API_URL
    );


    return response.data;


};