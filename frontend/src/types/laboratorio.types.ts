export type Laboratorio = {
    id: number;
    nombre: string;
    descripcion: string;
    estado: 'activo' | 'inactivo';
    created_at?: string;
}

export type LaboratorioResponse = {
    success: boolean;
    data: Laboratorio[];
}
