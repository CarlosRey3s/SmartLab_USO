import axios from "axios";


import type {
    DocenteDashboard
} from "../types/docenteDashboard.types";



const API_URL =
"http://localhost:4000/api/docente/dashboard";



export const obtenerDashboardDocente =
async (): Promise<DocenteDashboard> => {


    const response =
    await axios.get(
        API_URL
    );


    return response.data;


};