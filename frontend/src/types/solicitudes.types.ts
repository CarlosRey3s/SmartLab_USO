// src/types/solicitudes.types.ts

export interface EstacionSolicitud {
    id: number;
    nombre: string;
}

export interface InventarioSolicitud {
    id: number;
    nombre: string;
    cantidad: number;
}

export interface SolicitudPendiente {
    actividad_id: number;
    titulo: string;
    nota_adicional: string | null;
    estado_reserva: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | 'incompleto' | 'ausente';
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    fecha_creacion: string;
    motivo_resolucion?: string;
    solicitante_nombre: string;
    solicitante_apellido: string;
    solicitante_correo: string;
    solicitante_expediente: string;
    solicitante_rol?: string;
    laboratorio_nombre: string;
    edificio: string;
    aula: string;
    estaciones: EstacionSolicitud[];
    inventario: InventarioSolicitud[];
    es_propia: boolean;
}

export interface SolicitudesResponse {
    solicitudes: SolicitudPendiente[];
    total: number;
    page: number;
    totalPages: number;
    contadores: Record<string, number>;
}