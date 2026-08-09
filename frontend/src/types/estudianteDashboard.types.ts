export interface ReservaEstudiante {

    id: number;

    laboratorio: string;

    titulo: string;

    nota_adicional: string | null;

    estado_reserva: string;

    inicio: string;

    fin: string;

    edificio: string;

    piso: string;

    aula: string;

    estaciones: string;

}


export interface EstudianteDashboard {

    reservas: ReservaEstudiante[];

}