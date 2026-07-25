import axios from "axios";


import type {
    DashboardResponse
} from "../types/dashboard";

import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/api/dashboard`;




export const getDashboard =
    async (): Promise<DashboardResponse> => {


        const response =
            await axios.get<DashboardResponse>(
                API_URL
            );


        return response.data;


    };