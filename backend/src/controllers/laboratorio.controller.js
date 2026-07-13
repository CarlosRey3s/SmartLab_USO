const { pool } = require('../config/db');

// Obtener todos los laboratorios
const getAllLaboratorios = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                l.id, l.nombre, l.descripcion, l.edificio, l.piso, l.aula, l.estado, 
                l.modo_reserva, l.capacidad_maxima, l.coordinador_id,
                u.nombre as coordinador_nombre,
                EXISTS (
                    SELECT 1 FROM actividades a 
                    WHERE a.laboratorio_id = l.id 
                    AND a.fecha_hora_inicio <= NOW() 
                    AND a.fecha_hora_fin >= NOW()
                ) as ocupado
            FROM laboratorios l
            LEFT JOIN usuarios u ON l.coordinador_id = u.id
            ORDER BY l.nombre ASC
        `);
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Error al obtener laboratorios:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Crear un laboratorio (Soporta espacio completo y por estación)
const createLaboratorio = async (req, res) => {
    const { 
        nombre, descripcion, edificio, piso, aula, estado, 
        modo_reserva, capacidad_maxima, coordinador_id, estaciones 
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Iniciar transacción

        // Validaciones básicas
        if (!nombre || !edificio || !piso || !aula || !modo_reserva) {
            throw new Error('Faltan campos obligatorios');
        }

        // Insertar laboratorio principal
        const insertLabQuery = `
            INSERT INTO laboratorios 
            (nombre, descripcion, edificio, piso, aula, estado, modo_reserva, capacidad_maxima, coordinador_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;
        const labValues = [
            nombre, 
            descripcion || null, 
            edificio, 
            piso, 
            aula, 
            estado || 'disponible', 
            modo_reserva, 
            capacidad_maxima || 0,
            coordinador_id || null
        ];
        
        const labResult = await client.query(insertLabQuery, labValues);
        const laboratorioId = labResult.rows[0].id;

        // Insertar estaciones si el modo es "por_estacion"
        if (modo_reserva === 'por_estacion' && estaciones && Array.isArray(estaciones) && estaciones.length > 0) {
            const insertEstacionQuery = `
                INSERT INTO estaciones_trabajo (laboratorio_id, nombre, capacidad)
                VALUES ($1, $2, $3)
            `;
            for (const est of estaciones) {
                if (!est.nombre || !est.capacidad || est.capacidad <= 0) {
                    throw new Error('Estación de trabajo inválida o con capacidad incorrecta');
                }
                await client.query(insertEstacionQuery, [laboratorioId, est.nombre, est.capacidad]);
            }
        }

        await client.query('COMMIT'); // Confirmar transacción
        res.status(201).json({ status: 'success', message: 'Laboratorio creado exitosamente', data: { id: laboratorioId } });

    } catch (error) {
        await client.query('ROLLBACK'); // Revertir en caso de error
        console.error('Error al crear laboratorio:', error);
        
        // Manejar error de nombre duplicado
        if (error.code === '23505') { 
            return res.status(400).json({ status: 'error', message: 'El nombre del laboratorio ya existe' });
        }
        
        res.status(400).json({ status: 'error', message: error.message || 'Error al procesar la solicitud' });
    } finally {
        client.release(); // Liberar cliente de vuelta al pool
    }
};

// Obtener estaciones de un laboratorio
const getEstaciones = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
                e.id, e.nombre, e.capacidad, e.estado,
                EXISTS (
                    SELECT 1 
                    FROM actividades a 
                    LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
                    WHERE a.laboratorio_id = $1 
                      AND a.fecha_hora_inicio <= NOW() 
                      AND a.fecha_hora_fin >= NOW()
                      AND (
                         a.tipo IN ('clase', 'mantenimiento') OR 
                         (a.tipo = 'reserva' AND (re.estacion_id IS NULL OR re.estacion_id = e.id))
                      )
                ) as ocupado
             FROM estaciones_trabajo e 
             WHERE e.laboratorio_id = $1 
             ORDER BY e.nombre ASC`,
            [id]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Error al obtener estaciones:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Agregar estaciones a un laboratorio existente
const addEstaciones = async (req, res) => {
    const { id } = req.params;
    const { estaciones } = req.body;
    
    if (!estaciones || !Array.isArray(estaciones) || estaciones.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Faltan las estaciones' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const insertEstacionQuery = `
            INSERT INTO estaciones_trabajo (laboratorio_id, nombre, capacidad)
            VALUES ($1, $2, $3)
            RETURNING id, nombre, capacidad, estado
        `;
        
        const nuevasEstaciones = [];
        for (const est of estaciones) {
            if (!est.nombre || !est.capacidad || est.capacidad <= 0) {
                throw new Error('Estación de trabajo inválida o con capacidad incorrecta');
            }
            const result = await client.query(insertEstacionQuery, [id, est.nombre, est.capacidad]);
            nuevasEstaciones.push(result.rows[0]);
        }
        
        await client.query('COMMIT');
        res.status(201).json({ status: 'success', message: 'Estaciones agregadas exitosamente', data: nuevasEstaciones });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al agregar estaciones:', error);
        if (error.code === '23505') { 
            return res.status(400).json({ status: 'error', message: 'El nombre de una estación ya existe en este laboratorio' });
        }
        res.status(400).json({ status: 'error', message: error.message || 'Error al procesar la solicitud' });
    } finally {
        client.release();
    }
};

// Eliminar una estacion
const deleteEstacion = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM estaciones_trabajo WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Estación no encontrada' });
        }
        res.json({ status: 'success', message: 'Estación eliminada' });
    } catch (error) {
        console.error('Error al eliminar estación:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Actualizar un laboratorio
const updateLaboratorio = async (req, res) => {
    const { id } = req.params;
    const { 
        nombre, descripcion, edificio, piso, aula, estado, capacidad_maxima 
    } = req.body;

    try {
        const updateQuery = `
            UPDATE laboratorios 
            SET nombre = $1, descripcion = $2, edificio = $3, piso = $4, 
                aula = $5, estado = $6, capacidad_maxima = $7
            WHERE id = $8
            RETURNING *
        `;
        const values = [
            nombre, 
            descripcion || null, 
            edificio, 
            piso, 
            aula, 
            estado || 'disponible', 
            capacidad_maxima || 0,
            id
        ];

        const result = await pool.query(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Laboratorio no encontrado' });
        }

        res.json({ status: 'success', message: 'Laboratorio actualizado exitosamente', data: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar laboratorio:', error);
        if (error.code === '23505') { 
            return res.status(400).json({ status: 'error', message: 'El nombre del laboratorio ya existe' });
        }
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

// Eliminar un laboratorio
const deleteLaboratorio = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM laboratorios WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Laboratorio no encontrado' });
        }
        res.json({ status: 'success', message: 'Laboratorio eliminado' });
    } catch (error) {
        console.error('Error al eliminar laboratorio:', error);
        if (error.code === '23503') { // foreign_key_violation
            return res.status(400).json({ status: 'error', message: 'No se puede eliminar el laboratorio porque tiene registros asociados (ej. actividades)' });
        }
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllLaboratorios,
    createLaboratorio,
    updateLaboratorio,
    deleteLaboratorio,
    getEstaciones,
    addEstaciones,
    deleteEstacion
};
