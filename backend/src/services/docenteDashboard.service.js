const { pool } = require("../config/db");


class DocenteDashboardService {
    // ==========================================
    // LABORATORIOS DEL DOCENTE
    // ==========================================

    async getLaboratoriosDocente(docenteId) {
        const query = `
        SELECT DISTINCT
            l.id,
            l.nombre,
            l.edificio,
            l.aula,
            l.capacidad_maxima,
            l.estado
        FROM actividades a
        INNER JOIN laboratorios l
            ON l.id = a.laboratorio_id
        INNER JOIN clases_academicas ca
            ON ca.actividad_id = a.id
        WHERE ca.docente_id = $1
        ORDER BY l.nombre;
        `;
        const result = await pool.query(query, [docenteId]);
        return result.rows;
    }


    // ==========================================
    // AGENDA DEL DOCENTE
    // ==========================================


    async getAgendaDocente(docenteId) {
        const query = `
        SELECT
            a.id,
            ca.materia,
            ca.num_estudiantes,
            l.nombre AS laboratorio,
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
        WHERE ca.docente_id = $1
        ORDER BY a.fecha_hora_inicio;
        `;
        const result = await pool.query(query, [docenteId]);
        return result.rows;
    }

    // ==========================================
    // RESERVAS EN SUS LABORATORIOS
    // ==========================================

    async getReservasDocente(docenteId) {

        const query = `
        SELECT
            r.actividad_id,
            r.titulo,
            r.nota_adicional,
            r.estado_reserva,
            l.nombre AS laboratorio,
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
        WHERE l.id IN (
            SELECT 
                laboratorio_id
            FROM actividades a2
            INNER JOIN clases_academicas ca2
                ON ca2.actividad_id = a2.id
            WHERE ca2.docente_id = $1
        )
        ORDER BY a.fecha_hora_inicio;
        `;

        const result = await pool.query(query, [docenteId]);
        return result.rows;
    }

    // ========================================
    // DASHBOARD COMPLETO
    // ==========================================

    async getDashboard(docenteId) {
        const laboratorios = await this.getLaboratoriosDocente(docenteId);
        const agenda = await this.getAgendaDocente(docenteId);
        const reservas = await this.getReservasDocente(docenteId);
        return {
            laboratorios,
            agenda,
            reservas
        };
    }
}
module.exports = new DocenteDashboardService();