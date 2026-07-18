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

module.exports = {
    getUsoLaboratorios
};
