export interface HorarioEstudiante {


    id: number;

    laboratorio: string;

    edificio: string;

    aula: string;

    descripcion: string | null;

    materia: string;

    docente: string;

    inicio: string;

    fin: string;


}



export interface ReservaEstudiante {


    id: number;

    laboratorio: string;

    titulo: string;

    nota_adicional: string | null;

    estado_reserva: string;

    inicio: string;

    fin: string;


}



export interface EstudianteDashboard {


    horario: HorarioEstudiante[];

    reservas: ReservaEstudiante[];


}