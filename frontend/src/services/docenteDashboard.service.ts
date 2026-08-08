import axios from "axios";


import type {
    DocenteDashboard
} from "../types/docenteDashboard.types";
import { BASE_URL } from "../config/api";




const API_URL = `${BASE_URL}/api/docente/dashboard`;



export const obtenerDashboardDocente =
async (): Promise<DocenteDashboard> => {


    const response =
    await axios.get(
        API_URL
    );


    return response.data;


};