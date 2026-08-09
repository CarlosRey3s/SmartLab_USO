const { pool } = require("../config/db");

class EstudianteDashboardService {

    async getReservasEstudiante(usuarioId) {

        const query = `
            SELECT
                r.actividad_id AS id,
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
                ) AS fin,

                l.edificio,
                l.piso,
                l.aula,

                COALESCE(
                    STRING_AGG(
                        DISTINCT et.nombre,
                        ', '
                        ORDER BY et.nombre
                    ),
                    ''
                ) AS estaciones

            FROM reservas_estudiantes r

            INNER JOIN actividades a
                ON a.id = r.actividad_id

            INNER JOIN laboratorios l
                ON l.id = a.laboratorio_id

            LEFT JOIN reserva_estaciones re
                ON re.actividad_id = r.actividad_id

            LEFT JOIN estaciones_trabajo et
                ON et.id = re.estacion_id

            WHERE r.usuario_id = $1

            GROUP BY
                r.actividad_id,
                l.nombre,
                r.titulo,
                r.nota_adicional,
                r.estado_reserva,
                a.fecha_hora_inicio,
                a.fecha_hora_fin,
                l.edificio,
                l.piso,
                l.aula

            ORDER BY
                a.fecha_hora_inicio DESC;
        `;

        const result = await pool.query(query, [usuarioId]);

        return result.rows;
    }


    async getDashboard(usuarioId) {

        const reservas = await this.getReservasEstudiante(usuarioId);

        return {
            reservas
        };
    }

}

module.exports = new EstudianteDashboardService();