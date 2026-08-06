const { pool: db } = require('../config/db');

const getUsoLaboratorios = async (startDate, endDate) => {
    const client = await db.connect();
    try {
        const query = `
            SELECT 
                l.id,
                l.nombre,
                l.coordinador_id,
                COUNT(a.id)::INTEGER AS total_reservas,
                COALESCE(SUM(EXTRACT(EPOCH FROM (a.fecha_hora_fin - a.fecha_hora_inicio))/3600), 0)::FLOAT AS horas_uso,
                COALESCE((
                    SELECT CASE 
                        WHEN curr_act.tipo = 'mantenimiento' THEN 'Mantenimiento'
                        WHEN curr_act.tipo = 'clase' OR curr_act.tipo = 'reserva' THEN 'Ocupado'
                        ELSE 'Operativo'
                    END
                    FROM actividades curr_act 
                    WHERE curr_act.laboratorio_id = l.id 
                      AND NOW() BETWEEN curr_act.fecha_hora_inicio AND curr_act.fecha_hora_fin 
                    LIMIT 1
                ), 'Operativo') AS estado_actual
            FROM laboratorios l
            LEFT JOIN actividades a ON l.id = a.laboratorio_id 
                AND a.fecha_hora_inicio >= $1 
                AND a.fecha_hora_fin <= $2
            GROUP BY l.id, l.nombre, l.coordinador_id
            ORDER BY l.nombre ASC;
        `;
        const result = await client.query(query, [startDate, endDate]);

        const estudiantesQuery = `SELECT COUNT(id)::INTEGER AS count FROM usuarios WHERE rol = 'estudiante'`;
        const estudiantesRes = await client.query(estudiantesQuery);

        // Ojo: asumimos tipo_movimiento 'egreso' para instrumentos prestados.
        const prestamosQuery = `
            SELECT COALESCE(SUM(cantidad), 0)::INTEGER AS count 
            FROM movimiento_inventario 
            WHERE tipo_movimiento = 'egreso' 
            AND fecha_movimiento >= $1 
            AND fecha_movimiento <= $2
        `;
        const prestamosRes = await client.query(prestamosQuery, [startDate, endDate]);

        return {
            laboratorios: result.rows,
            globalStats: {
                estudiantesActivos: estudiantesRes.rows[0].count,
                instrumentosPrestados: prestamosRes.rows[0].count
            }
        };
    } catch (error) {
        console.error('Error al obtener uso de laboratorios:', error);
        throw error;
    } finally {
        client.release();
    }
};

const getReporteReservas = async (startDate, endDate, rol = 'todos', laboratorioId = null) => {
    const client = await db.connect();
    try {
        const params = [startDate, endDate];
        let paramIndex = 3;

        let whereClause = `WHERE a.fecha_hora_inicio >= $1::timestamp AND a.fecha_hora_inicio <= ($2::date + interval '1 day' - interval '1 second')`;

        if (rol && rol !== 'todos') {
            whereClause += ` AND LOWER(COALESCE(u_reserva.rol::text, u_docente.rol::text, u_tecnico.rol::text, '')) = LOWER($${paramIndex})`;
            params.push(rol);
            paramIndex++;
        }

        if (laboratorioId && laboratorioId !== 'todos' && laboratorioId !== '') {
            whereClause += ` AND l.id = $${paramIndex}`;
            params.push(parseInt(laboratorioId, 10));
            paramIndex++;
        }

        const query = `
            SELECT 
                a.id AS actividad_id,
                COALESCE(r.titulo, ca.materia, m.descripcion_ti, 'Actividad General') AS titulo,
                r.nota_adicional,
                COALESCE(r.estado_reserva, 'aprobada') AS estado_reserva,
                a.fecha_hora_inicio,
                a.fecha_hora_fin,
                a.fecha_creacion,
                COALESCE(u_reserva.id, u_docente.id, u_tecnico.id) AS usuario_id,
                COALESCE(u_reserva.nombre, u_docente.nombre, u_tecnico.nombre, 'N/A') AS solicitante_nombre,
                COALESCE(u_reserva.apellido, u_docente.apellido, u_tecnico.apellido, '') AS solicitante_apellido,
                COALESCE(u_reserva.correo, u_docente.correo, u_tecnico.correo, 'N/A') AS solicitante_correo,
                COALESCE(u_reserva.expediente, u_docente.expediente, u_tecnico.expediente, 'N/A') AS solicitante_expediente,
                LOWER(COALESCE(u_reserva.rol::text, u_docente.rol::text, u_tecnico.rol::text, 'estudiante')) AS solicitante_rol,
                l.id AS laboratorio_id,
                l.nombre AS laboratorio_nombre,
                l.edificio,
                l.aula,
                ROUND(EXTRACT(EPOCH FROM (a.fecha_hora_fin - a.fecha_hora_inicio))/3600::numeric, 2)::FLOAT AS horas_duracion,
                (
                    SELECT COALESCE(json_agg(json_build_object('id', e.id, 'nombre', e.nombre)), '[]')
                    FROM reserva_estaciones re 
                    JOIN estaciones_trabajo e ON re.estacion_id = e.id 
                    WHERE re.actividad_id = a.id
                ) AS estaciones,
                (
                    SELECT COALESCE(json_agg(json_build_object('id', i.id, 'nombre', i.nombre, 'cantidad', ri.cantidad_solicitada)), '[]')
                    FROM reserva_items ri 
                    JOIN item_inventario i ON ri.item_id = i.id 
                    WHERE ri.actividad_id = a.id
                ) AS inventario
            FROM actividades a
            JOIN laboratorios l ON a.laboratorio_id = l.id
            LEFT JOIN reservas_estudiantes r ON a.id = r.actividad_id
            LEFT JOIN usuarios u_reserva ON r.usuario_id = u_reserva.id
            LEFT JOIN clases_academicas ca ON a.id = ca.actividad_id
            LEFT JOIN usuarios u_docente ON ca.docente_id = u_docente.id
            LEFT JOIN mantenimientos m ON a.id = m.actividad_id
            LEFT JOIN usuarios u_tecnico ON m.tecnico_id = u_tecnico.id
            ${whereClause}
            ORDER BY a.fecha_hora_inicio DESC;
        `;

        const result = await client.query(query, params);
        const reservas = result.rows;

        const totalReservas = reservas.length;
        const reservasAprobadas = reservas.filter(r => ['aprobada', 'entregado', 'completada'].includes(r.estado_reserva)).length;
        const horasReservadas = Math.round(reservas.reduce((acc, r) => acc + (parseFloat(r.horas_duracion) || 0), 0) * 10) / 10;
        const usuariosUnicos = new Set(reservas.map(r => r.usuario_id)).size;

        return {
            reservas,
            stats: {
                totalReservas,
                reservasAprobadas,
                horasReservadas,
                usuariosUnicos
            }
        };
    } catch (error) {
        console.error('Error al obtener reporte de reservas:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getUsoLaboratorios,
    getReporteReservas
};
