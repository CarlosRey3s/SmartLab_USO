export interface ReservaEstudiante {

    id: number;

    titulo: string;

    estado_reserva: string;

    inicio: string;

    fin: string;

    laboratorio: string;

    edificio: string;

    aula: string;

    estaciones: number;

    inventario: InventarioReserva[];

}


export interface InventarioReserva {

    id: number;

    nombre: string;

    cantidad: number;

}


export interface ResumenDashboard {

    total: number;

    pendientes: number;

    aprobadas: number;

    completadas: number;

    canceladas: number;

    rechazadas: number;

}


export interface EstudianteDashboard {

    reservas: ReservaEstudiante[];

    resumen: ResumenDashboard;

}