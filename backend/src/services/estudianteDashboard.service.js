const { pool } = require("../config/db");


class EstudianteDashboardService {


    // =====================================================
    // HORARIO ACADÉMICO
    // =====================================================

    async getHorarioEstudiante() {


        const query = `

        SELECT

            a.id,

            l.nombre AS laboratorio,

            l.edificio,

            l.aula,

            l.descripcion,

            ca.materia,


            CONCAT(
                u.nombre,
                ' ',
                u.apellido
            ) AS docente,


            TO_CHAR(
                a.fecha_hora_inicio,
                'YYYY-MM-DD HH24:MI'
            ) AS inicio,


            TO_CHAR(
                a.fecha_hora_fin,
                'YYYY-MM-DD HH24:MI'
            ) AS fin


        FROM actividades a


        INNER JOIN clases_academicas ca
            ON ca.actividad_id = a.id


        INNER JOIN laboratorios l
            ON l.id = a.laboratorio_id


        INNER JOIN usuarios u
            ON u.id = ca.docente_id



        WHERE a.tipo = 'clase'


        ORDER BY 
            a.fecha_hora_inicio;


        `;


        const result =
            await pool.query(query);


        return result.rows;


    }






    // =====================================================
    // RESERVAS DEL ESTUDIANTE
    // =====================================================

    async getReservasEstudiante(usuarioId) {


        const query = `


        SELECT


            a.id,


            l.nombre AS laboratorio,


            r.titulo,


            r.nota_adicional,


            r.estado_reserva,


            TO_CHAR(
                a.fecha_hora_inicio,
                'YYYY-MM-DD HH24:MI'
            ) AS inicio,


            TO_CHAR(
                a.fecha_hora_fin,
                'YYYY-MM-DD HH24:MI'
            ) AS fin



        FROM reservas_estudiantes r


        INNER JOIN actividades a
            ON a.id = r.actividad_id


        INNER JOIN laboratorios l
            ON l.id = a.laboratorio_id



        WHERE r.usuario_id = $1



        ORDER BY 
            a.fecha_hora_inicio;



        `;



        const result =
            await pool.query(
                query,
                [
                    usuarioId
                ]
            );


        return result.rows;


    }







    // =====================================================
    // DASHBOARD COMPLETO
    // =====================================================


    async getDashboard(usuarioId) {


        const horario =
            await this.getHorarioEstudiante();



        const reservas =
            await this.getReservasEstudiante(
                usuarioId
            );



        return {


            horario,


            reservas


        };


    }



}



module.exports =
new EstudianteDashboardService();