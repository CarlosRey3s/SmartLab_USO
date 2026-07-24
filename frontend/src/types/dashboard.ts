export interface DashboardKPI {

    solicitudes_pendientes:number;

    stock_bajo:number;

    actividades_hoy:number;

    laboratorios_ocupados:number;

    total_laboratorios:number;

}



export interface ReservaSemana {

    dia:string;

    reservas:number;

    completadas:number;

}



export interface AlertaDashboard {


    tipo:string;

    titulo:string;

    detalle:string;

    fecha:string;


}



export interface SaturacionLaboratorio {


    nombre:string;

    actividades:number;

    porcentaje:number;


}



export interface AgendaDashboard {


    hora:string;

    actividad:string;

    laboratorio:string;


}




export interface DashboardResponse {


    kpis:DashboardKPI;


    reservas:ReservaSemana[];


    alertas:AlertaDashboard[];


    saturacion:SaturacionLaboratorio[];


    agenda:AgendaDashboard[];


}