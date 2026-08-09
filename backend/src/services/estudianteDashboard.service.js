const {
    obtenerTodasSolicitudes
} = require('./actividades.service');

const obtenerDashboardEstudiante = async (usuarioId, rol) => {

    try {

        // =====================================================
        // OBTENER RESERVAS DESDE ACTIVIDADES SERVICE
        // NO MODIFICAMOS ACTIVIDADES SERVICE
        // =====================================================

        const resultado = await obtenerTodasSolicitudes(
            usuarioId,
            rol,
            null,
            1,
            100
        );

        const solicitudes = resultado?.solicitudes || [];

        // =====================================================
        // TRANSFORMAR DATOS PARA EL DASHBOARD
        // =====================================================

        const reservas = solicitudes.map((reserva) => {

            const inicio = reserva.fecha_hora_inicio
                ? new Date(reserva.fecha_hora_inicio)
                : null;

            const fin = reserva.fecha_hora_fin
                ? new Date(reserva.fecha_hora_fin)
                : null;

            return {

                id: reserva.actividad_id,

                titulo: reserva.titulo || '',

                estado_reserva:
                    reserva.estado_reserva || '',

                inicio: inicio
                    ? formatearFecha(inicio)
                    : '',

                fin: fin
                    ? formatearFecha(fin)
                    : '',

                laboratorio:
                    reserva.laboratorio_nombre || 'Espacio no disponible',

                edificio:
                    reserva.edificio || 'Sin edificio',

                aula:
                    reserva.aula || 'Sin aula',

                // =================================================
                // ESTACIONES
                // =================================================

                estaciones:
                    Array.isArray(reserva.estaciones)
                        ? reserva.estaciones.length
                        : 0,

                // =================================================
                // INVENTARIO
                // =================================================

                inventario:
                    Array.isArray(reserva.inventario)
                        ? reserva.inventario
                        : []

            };

        });

        // =====================================================
        // RESPUESTA FINAL
        // =====================================================

        return {

            reservas,

            resumen: {

                total: reservas.length,

                pendientes:
                    reservas.filter(
                        r => r.estado_reserva === 'pendiente'
                    ).length,

                aprobadas:
                    reservas.filter(
                        r => r.estado_reserva === 'aprobada'
                    ).length,

                completadas:
                    reservas.filter(
                        r => r.estado_reserva === 'completada'
                    ).length,

                canceladas:
                    reservas.filter(
                        r => r.estado_reserva === 'cancelada'
                    ).length,

                rechazadas:
                    reservas.filter(
                        r => r.estado_reserva === 'rechazada'
                    ).length

            }

        };

    } catch (error) {

        console.error(
            'Error en obtenerDashboardEstudiante:',
            error
        );

        throw error;

    }

};


// =========================================================
// FORMATEAR FECHA
// =========================================================

const formatearFecha = (fecha) => {

    const pad = (numero) =>
        String(numero).padStart(2, '0');

    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;

};


module.exports = {
    obtenerDashboardEstudiante
};