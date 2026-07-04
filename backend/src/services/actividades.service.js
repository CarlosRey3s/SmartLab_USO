// ✅ Como debe quedar (Extrayendo el pool y renombrándolo a db)
const { pool: db } = require('../config/db');

/*
 * Función interna para verificar si el laboratorio ya está ocupado
 */
const verificarChoqueHorario = async (client, laboratorio_id, inicioDatetime, finDatetime, tipoNuevaActividad, datosModal, idActividadExcluir = null) => {

    // 1 verificar si el laboratorio esta en mantenimiento o clausurado fisicamente
    const queryEstadoLab = 'SELECT estado FROM laboratorios WHERE id = $1';
    const resEstadoLab = await client.query(queryEstadoLab, [laboratorio_id]);

    if (resEstadoLab.rows.length === 0) {
        throw new Error('El laboratorio especificado no existe.');
    }

    const estadoActualLab = resEstadoLab.rows[0].estado;
    if (estadoActualLab === 'clausurado') {
        throw new Error('No se puede programar ninguna actividad porque el laboratorio esta Clausurado.');
    }
    if (estadoActualLab === 'mantenimiento' && tipoNuevaActividad !== 'mantenimiento') {
        throw new Error('El laboratorio esta bajo mantenimiento. No se permiten clases ni reservas hasta nuevo aviso.');
    }

    // 2 Consulta base para detectar solapamiento de tiempos en el mismo laboratorio.
    // Si estamos editando (PUT) excluimos la actividad actual para que no choque consigo misma.
    let queryChoques = `
        SELECT a.id, a.tipo, re.estacion_id
        FROM actividades a
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1
          AND a.fecha_hora_inicio < $2 
          AND a.fecha_hora_fin > $3
    `;
    const parametros = [laboratorio_id, finDatetime, inicioDatetime];

    if (idActividadExcluir) {
        queryChoques += ' AND a.id != $4';
        parametros.push(idActividadExcluir);
    }

    const resChoque = await client.query(queryChoques, parametros);
    // CORRECCIÓN: Nombre de variable corregido (quitada la doble 't')
    const actividadesConflictivas = resChoque.rows;

    // Si no hay actividades en ese rango de tiempo, el horario es libre
    if (actividadesConflictivas.length === 0) {
        return;
    }

    // 3 Evaluar si hay conflictos segun las reglas de negocio especificadas 
    if (tipoNuevaActividad === 'clase' || tipoNuevaActividad === 'mantenimiento') {
        // regla 1 y 2 clase o mantenimiento requieren bloqueo Absoluto. No importa que haya.
        throw new Error(`El laboratorio ya está ocupado en este horario por otra actividad de tipo ${tipoNuevaActividad}.`);
    } else if (tipoNuevaActividad === 'reserva') {
        // regla: Una nueva reserva de estudiante no puede chocar con Clases, Mantenimientos o la misma Estacion
        const estacionNueva = datosModal.estacion;

        for (const actividad of actividadesConflictivas) {
            if (actividad.tipo === 'clase') {
                throw new Error(`No puedes reservar en este horario porque el laboratorio estara ocupado por una Clase Academica. ${actividad.id}`);
            }
            if (actividad.tipo === 'mantenimiento') {
                throw new Error(`No puedes reservar en este horario porque el laboratorio estara ocupado por un Mantenimiento. ${actividad.id}`);
            }
            if (actividad.tipo === 'reserva') {
                // Multiples reservas simultaneas permitidas SOLO si usan distintas estaciones
                if (actividad.estacion_id === estacionNueva && estacionNueva !== null) {
                    throw new Error(`La estacion de trabajo seleccionada ya esta reservada por otro estudiante en este horario.`);
                }
            }
        }
    }
};

/**
 * Función principal que llama el controlador
 */
const programarActividad = async (datosModal, idUsuarioLogueado) => {
    const { tipo, laboratorio, fecha, desde, hasta, numPersonas, recurrencia } = datosModal;

    // 1. Transformar las fechas y horas a formato DATETIME/TIMESTAMP
    const inicioDatetime = new Date(`${fecha}T${desde}`);
    const finDatetime = new Date(`${fecha}T${hasta}`);

    // 2. Traducción de recurrencia segura
    let dbRecurrencia = 'no_repite';
    if (recurrencia === 'Todos los días' || recurrencia === 'Todos los dias') dbRecurrencia = 'diario';
    else if (recurrencia.includes('semana')) dbRecurrencia = 'semanal';
    else if (recurrencia.includes('mes')) dbRecurrencia = 'mensual';
    else if (recurrencia.includes('hábiles')) dbRecurrencia = 'dias_habiles';

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // [VALIDACIÓN CRÍTICA]: Ejecutar el árbol lógico de choques de horarios e infraestructura
        await verificarChoqueHorario(client, laboratorio, inicioDatetime, finDatetime, tipo, datosModal);

        // si la nueva actividad es un mantenimiento, actualizamos fisicamente el estado
        if (tipo === 'mantenimiento') {
            await client.query(`UPDATE laboratorios SET estado = 'en_mantenimiento' WHERE id = $1`, [laboratorio]);
            console.log(`-> Estado del laboratorio ${laboratorio} cambiado a 'en_mantenimiento'`);
        }
        
        // --- PASO A: Insertar en la tabla padre (actividades) ---
        const queryBase = `
            INSERT INTO actividades (laboratorio_id, tipo, fecha_hora_inicio, fecha_hora_fin, recurrencia) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const resultBase = await client.query(queryBase, [laboratorio, tipo, inicioDatetime, finDatetime, dbRecurrencia]);
        const idGenerado = resultBase.rows[0]?.id;

        if (!idGenerado) {
            throw new Error("Fallo crítico: No se pudo obtener el ID de la nueva actividad.");
        }
        console.log("-> ID de actividad creado exitosamente:", idGenerado);
        
        // --- PASO B: Insertar en la tabla hija correspondiente según tu diseño ---
        if (tipo === 'clase') {
            // Tabla: clases_academicas (actividad_id, materia, docente_id, num_estudiantes)
            const queryHija = `INSERT INTO clases_academicas (actividad_id, materia, docente_id, num_estudiantes) VALUES ($1, $2, $3, $4)`;
            const docenteId = datosModal.docente || idUsuarioLogueado; 
            await client.query(queryHija, [idGenerado, datosModal.materia, docenteId, numPersonas]);
        } else if (tipo === 'mantenimiento') {
            // Tabla: mantenimientos (actividad_id, tecnico_id, descripcion_ti)
            const queryHija = `INSERT INTO mantenimientos (actividad_id, tecnico_id, descripcion_ti) VALUES ($1, $2, $3)`;
            const tecnicoId = datosModal.responsable || idUsuarioLogueado;
            await client.query(queryHija, [idGenerado, tecnicoId, datosModal.descripcion || 'Sin descripción']);
        } else if (tipo === 'reserva') {
            const queryHija = `INSERT INTO reservas_estudiantes (actividad_id, usuario_id, estacion_id, titulo, nota_adicional) VALUES ($1, $2, $3, $4, $5)`;
            const estacionId = datosModal.estacion || null; 
            await client.query(queryHija, [idGenerado, idUsuarioLogueado, estacionId, datosModal.titulo, datosModal.descripcion || null]);
        }
        
        await client.query('COMMIT');
        return { exito: true, mensaje: 'Actividad programada exitosamente', id: idGenerado };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al programar actividad en el Service:', error);
        throw new Error('Error al programar la actividad. Por favor, inténtalo de nuevo.');
    } finally {
        if (client) client.release();
    }
};

/*
 * Modificar Actividad (PUT)
 */
const actualizarActividad = async (idActividad, datosModal, idUsuarioLogueado) => {
    const { tipo, laboratorio, fecha, desde, hasta, numPersonas, recurrencia } = datosModal;

    // CORRECCIÓN: Renombrado a Datetime por consistencia
    const inicioDatetime = new Date(`${fecha}T${desde}`);
    const finDatetime = new Date(`${fecha}T${hasta}`);

    let dbRecurrencia = 'no_repite';
    if (recurrencia === 'Todos los días' || recurrencia === 'Todos los dias') dbRecurrencia = 'diario';
    else if (recurrencia.includes('semana')) dbRecurrencia = 'semanal';
    else if (recurrencia.includes('mes')) dbRecurrencia = 'mensual';
    else if (recurrencia.includes('hábiles')) dbRecurrencia = 'dias_habiles';

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Actualizar la tabla padre (actividades)
        const queryBase = `
            UPDATE actividades 
            SET laboratorio_id = $1, fecha_hora_inicio = $2, fecha_hora_fin = $3, recurrencia = $4
            WHERE id = $5
        `;
        await client.query(queryBase, [laboratorio, inicioDatetime, finDatetime, dbRecurrencia, idActividad]);

        // Actualizar la tabla hija correspondiente según el tipo
        if (tipo === 'clase') {
            const docenteId = datosModal.docente || idUsuarioLogueado; 
            const queryHija = `UPDATE clases_academicas SET materia = $1, docente_id = $2, num_estudiantes = $3 WHERE actividad_id = $4`;
            await client.query(queryHija, [datosModal.materia, docenteId, numPersonas, idActividad]);
        } else if (tipo === 'mantenimiento') {
            const tecnicoId = datosModal.responsable || idUsuarioLogueado;
            const queryHija = `UPDATE mantenimientos SET tecnico_id = $1, descripcion_ti = $2 WHERE actividad_id = $3`;
            await client.query(queryHija, [tecnicoId, datosModal.descripcion || 'Sin descripción', idActividad]);
        } else if (tipo === 'reserva') {
            const estacionId = datosModal.estacion || null; 
            const queryHija = `UPDATE reservas_estudiantes SET estacion_id = $1, titulo = $2, nota_adicional = $3 WHERE actividad_id = $4`;
            await client.query(queryHija, [estacionId, datosModal.titulo, datosModal.descripcion || null, idActividad]);
        }
        
        await client.query('COMMIT');
        return { exito: true, mensaje: 'Actividad actualizada exitosamente' };  
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar actividad en el Service:', error);
        throw new Error('Error al actualizar la actividad. Por favor, inténtalo de nuevo.');
    } finally {
        if (client) client.release();
    }
};

/**
 * Leer Actividades (GET)
 */
const obtenerActividades = async () => {
    const client = await db.connect();
    try {
        const query = `
           SELECT 
                a.id, 
                CASE 
                    WHEN a.tipo = 'clase' THEN ca.materia
                    WHEN a.tipo = 'reserva' THEN re.titulo
                    WHEN a.tipo = 'mantenimiento' THEN 'Mantenimiento Preventivo'
                    ELSE 'Actividad'
                END AS title, 
                a.fecha_hora_inicio AS start, 
                a.fecha_hora_fin AS end, 
                a.tipo,
                a.laboratorio_id,
                ca.materia, 
                ca.docente_id, 
                ca.num_estudiantes AS clase_estudiantes,
                m.tecnico_id AS tecnico_responsable, 
                m.descripcion_ti AS mant_descripcion,
                re.titulo AS reserva_titulo,
                re.estacion_id,
                re.nota_adicional AS reserva_nota,
                re.estado_reserva
            FROM 
                actividades a
            LEFT JOIN 
                clases_academicas ca ON a.id = ca.actividad_id
            LEFT JOIN 
                mantenimientos m ON a.id = m.actividad_id
            LEFT JOIN 
                reservas_estudiantes re ON a.id = re.actividad_id;
        `;
        const result = await client.query(query);
        return result.rows; 
    } catch (error) {
        console.error('Error al obtener actividades:', error);
        throw new Error('Error al obtener las actividades. Por favor, inténtalo de nuevo.');
    } finally {
        if (client) client.release();
    }
};

/**
 * Función para eliminar una actividad existente
 */
const eliminarActividad = async (idActividad) => {
    const client = await db.connect();
    try {
        const query = 'DELETE FROM actividades WHERE id = $1';
        const result = await client.query(query, [idActividad]);
        
        // Verificar si realmente se eliminó alguna fila
        if (result.rowCount === 0) {
            throw new Error('No se encontró la actividad con el ID proporcionado.');
        }

        return { exito: true, mensaje: 'Actividad eliminada exitosamente' };

    } catch (error) {
        console.error('Error al eliminar actividad en el Service:', error);
        throw new Error(error.mensaje || 'Error al eliminar la actividad. Por favor, inténtalo de nuevo.');
    } finally {
        if (client) client.release();
    }
}; // CORRECCIÓN: Se eliminó la llave '}' extra que estaba aquí abajo.

module.exports = { programarActividad, obtenerActividades, actualizarActividad, eliminarActividad };