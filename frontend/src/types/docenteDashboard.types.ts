export interface LaboratorioDocente {

    id: number;
    nombre: string;
    edificio: string;
    aula: string;
    capacidad_maxima: number;
    estado: string;
}



export interface AgendaDocente {

    id: number;
    materia: string;
    num_estudiantes: number;
    laboratorio: string;
    inicio: string;
    fin: string;
}



export interface ReservaDocente {

    actividad_id: number;
    titulo: string;
    nota_adicional: string | null;
    estado_reserva: string;
    laboratorio: string;
    inicio: string;
    fin: string;
}

export interface DocenteDashboard {

    laboratorios: LaboratorioDocente[];
    agenda: AgendaDocente[];
    reservas: ReservaDocente[];
}