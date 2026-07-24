const { pool } = require("../config/db");

class DashboardService {

    // =====================================
    // KPIs
    // =====================================
    async getKPIs() {

        const query = `
        SELECT

        (
            SELECT COUNT(*)
            FROM reservas_estudiantes
            WHERE estado_reserva='pendiente'
        )::int AS solicitudes_pendientes,

        (
            SELECT COUNT(*)
            FROM item_inventario
            WHERE cantidad_actual <= stock_minimo
        )::int AS stock_bajo,

        (
            SELECT COUNT(*)
            FROM actividades
            WHERE DATE(fecha_hora_inicio)=CURRENT_DATE
        )::int AS actividades_hoy,

        (
            SELECT COUNT(DISTINCT laboratorio_id)
            FROM actividades
            WHERE NOW() BETWEEN fecha_hora_inicio
            AND fecha_hora_fin
        )::int AS laboratorios_ocupados,

        (
            SELECT COUNT(*)
            FROM laboratorios
        )::int AS total_laboratorios;
        `;

        const { rows } = await pool.query(query);

        return rows[0];

    }



    // =====================================
    // RESERVAS SEMANA
    // =====================================
    async getReservasSemana() {

        const query = `
        SELECT

            TO_CHAR(a.fecha_hora_inicio,'Dy') AS dia,

            COUNT(*)::int AS reservas,

            COUNT(
                CASE
                    WHEN r.estado_reserva='completada'
                    THEN 1
                END
            )::int AS completadas

        FROM actividades a

        LEFT JOIN reservas_estudiantes r
            ON r.actividad_id=a.id

        WHERE a.tipo='reserva'

        GROUP BY
            DATE(a.fecha_hora_inicio),
            TO_CHAR(a.fecha_hora_inicio,'Dy')

        ORDER BY
            DATE(a.fecha_hora_inicio);
        `;

        const { rows } = await pool.query(query);

        return rows;

    }



    // =====================================
    // ALERTAS
    // =====================================
    async getAlertas() {

        const query = `
        SELECT *
        FROM(

            SELECT

                'stock' AS tipo,
                i.nombre AS titulo,
                'Stock bajo' AS detalle,
                MAX(m.fecha_movimiento) AS fecha

            FROM item_inventario i

            LEFT JOIN movimiento_inventario m
                ON m.item_id=i.id

            WHERE i.cantidad_actual<=i.stock_minimo

            GROUP BY
                i.id,
                i.nombre

            UNION ALL

            SELECT

                'reserva',
                r.titulo,
                'Solicitud pendiente',
                a.fecha_creacion

            FROM reservas_estudiantes r

            JOIN actividades a
                ON a.id=r.actividad_id

            WHERE r.estado_reserva='pendiente'

            UNION ALL

            SELECT

                'mantenimiento',
                m.descripcion_ti,
                'Mantenimiento programado',
                a.fecha_creacion

            FROM mantenimientos m

            JOIN actividades a
                ON a.id=m.actividad_id

        ) alertas

        ORDER BY fecha DESC

        LIMIT 10;
        `;

        const { rows } = await pool.query(query);

        return rows;

    }



    // =====================================
    // SATURACION
    // =====================================
    async getSaturacion() {

        const query = `
        SELECT

            l.nombre,

            COUNT(a.id)::int AS actividades,

            COALESCE(

                ROUND(
                    (
                        COUNT(a.id)::numeric /
                        NULLIF(l.capacidad_maxima,0)
                    )*100
                ),

                0

            )::int AS porcentaje

        FROM laboratorios l

        LEFT JOIN actividades a
            ON a.laboratorio_id=l.id

        GROUP BY
            l.id,
            l.nombre,
            l.capacidad_maxima

        ORDER BY l.nombre;
        `;

        const { rows } = await pool.query(query);

        return rows;

    }



    // =====================================
    // AGENDA
    // =====================================
    async getAgenda() {

        const query = `
        SELECT

            TO_CHAR(a.fecha_hora_inicio,'HH24:MI') AS hora,

            CASE

                WHEN a.tipo='clase'
                    THEN c.materia

                WHEN a.tipo='reserva'
                    THEN r.titulo

                WHEN a.tipo='mantenimiento'
                    THEN m.descripcion_ti

            END AS actividad,

            l.nombre AS laboratorio

        FROM actividades a

        JOIN laboratorios l
            ON l.id=a.laboratorio_id

        LEFT JOIN clases_academicas c
            ON c.actividad_id=a.id

        LEFT JOIN reservas_estudiantes r
            ON r.actividad_id=a.id

        LEFT JOIN mantenimientos m
            ON m.actividad_id=a.id

        WHERE DATE(a.fecha_hora_inicio)=CURRENT_DATE

        ORDER BY a.fecha_hora_inicio;
        `;

        const { rows } = await pool.query(query);

        return rows;

    }

}

module.exports = new DashboardService();