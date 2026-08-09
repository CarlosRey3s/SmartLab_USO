export interface DashboardKPI {

  solicitudes_pendientes: number;

  stock_bajo: number;

  actividades_hoy: number;

  espacios_ocupados: number;

  total_espacios: number;

}





export interface ReservaSemana {

  dia: string;

  reservas: number;

  completadas: number;

}





export interface AlertaDashboard {

  tipo: string;

  titulo: string;

  detalle: string;

  fecha?: string;

}





export interface AgendaDashboard {

  dia?: string;

  hora: string;

  actividad: string;

  espacio: string;

}





export interface DashboardResponse {


  kpis: DashboardKPI;


  reservas: ReservaSemana[];


  alertas: AlertaDashboard[];


  agenda: AgendaDashboard[];


  agendaSemana: AgendaDashboard[];


}