import axios from "axios";


import type {
    DashboardResponse
} from "../types/dashboard";



const API_URL =
"http://localhost:4000/api/dashboard";




export const getDashboard =
async():Promise<DashboardResponse>=>{


    const response =
    await axios.get<DashboardResponse>(
        API_URL
    );


    return response.data;


};