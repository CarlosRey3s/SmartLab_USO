const { pool } = require("../config/db");

class DashboardService {


    // ==============================
    // TARJETAS SUPERIORES
    // ==============================

    async getKPIs(){

        const query = `

        SELECT

        (
            SELECT COUNT(*)
            FROM reservas_estudiantes
            WHERE estado_reserva='pendiente'
        ) AS solicitudes_pendientes,


        (
            SELECT COUNT(*)
            FROM item_inventario
            WHERE cantidad_actual <= stock_minimo
        ) AS stock_bajo,


        (
            SELECT COUNT(*)
            FROM actividades
            WHERE DATE(fecha_hora_inicio)=CURRENT_DATE
        ) AS actividades_hoy,


        (
            SELECT COUNT(*)
            FROM laboratorios
            WHERE estado='disponible'
            AND id IN (
                SELECT laboratorio_id
                FROM actividades
                WHERE NOW() BETWEEN fecha_hora_inicio 
                AND fecha_hora_fin
            )
        ) AS laboratorios_ocupados,


        (
            SELECT COUNT(*)
            FROM laboratorios
        ) AS total_laboratorios;


        `;


        const result = await pool.query(query);

        return result.rows[0];

    }





    // ==============================
    // RESERVAS SEMANALES
    // ==============================

    async getReservasSemana(){

        const query=`

        SELECT

        TO_CHAR(
        fecha_hora_inicio,
        'Dy'
        ) AS dia,


        COUNT(*) AS reservas,


        COUNT(
            CASE 
            WHEN re.estado_reserva='completada'
            THEN 1
            END
        ) AS completadas


        FROM actividades a


        LEFT JOIN reservas_estudiantes re
        ON re.actividad_id=a.id


        WHERE fecha_hora_inicio >= CURRENT_DATE - INTERVAL '6 days'


        GROUP BY dia, DATE(fecha_hora_inicio)


        ORDER BY DATE(fecha_hora_inicio);


        `;


        const result=await pool.query(query);

        return result.rows;

    }






    // ==============================
    // ALERTAS
    // ==============================


    async getAlertas(){


        const query=`

        SELECT *

        FROM (

            SELECT

            'stock' AS tipo,

            nombre AS titulo,

            'Stock bajo' AS detalle,

            fecha_movimiento AS fecha


            FROM item_inventario i

            LEFT JOIN movimiento_inventario m
            ON m.item_id=i.id


            WHERE cantidad_actual <= stock_minimo



            UNION ALL



            SELECT

            'reserva',

            titulo,

            'Solicitud pendiente',

            a.fecha_creacion


            FROM reservas_estudiantes r

            JOIN actividades a
            ON a.id=r.actividad_id


            WHERE estado_reserva='pendiente'




            UNION ALL



            SELECT

            'mantenimiento',

            descripcion_ti,

            'Mantenimiento pendiente',

            a.fecha_creacion


            FROM mantenimientos m

            JOIN actividades a
            ON a.id=m.actividad_id


        ) AS alertas


        ORDER BY fecha DESC

        LIMIT 10;


        `;


        const result=await pool.query(query);

        return result.rows;

    }






    // ==============================
    // SATURACIÓN DE LABORATORIOS
    // ==============================


    async getSaturacion(){


        const query=`

        SELECT


        l.nombre,


        COUNT(a.id) AS actividades,


        ROUND(

        (
        COUNT(a.id)::decimal /
        NULLIF(l.capacidad_maxima,0)
        )*100

        ) AS porcentaje



        FROM laboratorios l


        LEFT JOIN actividades a

        ON a.laboratorio_id=l.id


        GROUP BY l.id;



        `;


        const result=await pool.query(query);


        return result.rows;


    }






    // ==============================
    // AGENDA DEL DIA
    // ==============================


    async getAgenda(){


        const query=`

        SELECT


        TO_CHAR(
        a.fecha_hora_inicio,
        'HH24:MI'
        ) hora,


        CASE


        WHEN a.tipo='clase'
        THEN c.materia


        WHEN a.tipo='reserva'
        THEN r.titulo


        WHEN a.tipo='mantenimiento'
        THEN m.descripcion_ti


        END AS actividad,


        l.nombre laboratorio



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


        const result=await pool.query(query);


        return result.rows;


    }




}


module.exports=new DashboardService();