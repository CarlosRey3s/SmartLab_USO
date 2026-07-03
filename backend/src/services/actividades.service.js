// ✅ Como debe quedar (Extrayendo el pool y renombrándolo a db)
const { pool: db } = require('../config/db');

/*
 * Función interna para verificar si el laboratorio ya está ocupado
 */
const verificarChoqueHorario = async (laboratorio_id, inicioDatetime, finDatetime) => {
    // Temporalmente devolvemos false para evitar bloqueos en el desarrollo 
    return false;
};

/**
 * Función principal que llama el controlador
 */
const programarActividad = async (datosModal, idUsuarioLogueado) => {
    const { tipo, laboratorio, fecha, desde, hasta, numPersonas, recurrencia } = datosModal;

    // 1. Transformar las fechas y horas a formato DATETIME/TIMESTAMP
    const inicioDatetime = new Date(`${fecha}T${desde}`);
    const finDatetime = new Date(`${fecha}T${hasta}`);

    // 2. Verificar si el laboratorio está libre
    const choque = await verificarChoqueHorario(laboratorio, inicioDatetime, finDatetime);
    if (choque) {
        throw new Error('El laboratorio ya está ocupado en ese horario.');
    }

    // 3. Traducción de recurrencia segura
    let dbRecurrencia = 'no_repite';
    if (recurrencia === 'Todos los días' || recurrencia === 'Todos los dias') dbRecurrencia = 'diario';
    else if (recurrencia.includes('semana')) dbRecurrencia = 'semanal';
    else if (recurrencia.includes('mes')) dbRecurrencia = 'mensual';
    else if (recurrencia.includes('hábiles')) dbRecurrencia = 'dias_habiles';

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // --- PASO A: Insertar en la tabla padre (actividades) ---
        const queryBase = `
            INSERT INTO actividades (laboratorio_id, tipo, fecha_hora_inicio, fecha_hora_fin, recurrencia) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const valoresBase = [laboratorio, tipo, inicioDatetime, finDatetime, dbRecurrencia];

        const resultBase = await client.query(queryBase, valoresBase);
        const idGenerado = resultBase.rows[0]?.id;

        if (!idGenerado) {
            throw new Error("Fallo crítico: No se pudo obtener el ID de la nueva actividad.");
        }

        console.log("-> ID de actividad creado exitosamente:", idGenerado);

        // --- PASO B: Insertar en la tabla hija correspondiente según tu diseño ---
        if (tipo === 'clase') {
            // Tabla: clases_academicas (actividad_id, materia, docente_id, num_estudiantes)
            const queryHija = `
                INSERT INTO clases_academicas (actividad_id, materia, docente_id, num_estudiantes) 
                VALUES ($1, $2, $3, $4)
            `;
            // Si el modal no manda un docente específico, usamos el id del usuario logueado
            const docenteId = datosModal.docente || idUsuarioLogueado;
            await client.query(queryHija, [idGenerado, datosModal.materia, docenteId, numPersonas]);

        } else if (tipo === 'mantenimiento') {
            // Tabla: mantenimientos (actividad_id, tecnico_id, descripcion_ti)
            const queryHija = `
                INSERT INTO mantenimientos (actividad_id, tecnico_id, descripcion_ti) 
                VALUES ($1, $2, $3)
            `;
            const tecnicoId = datosModal.responsable || idUsuarioLogueado;
            await client.query(queryHija, [idGenerado, tecnicoId, datosModal.descripcion || 'Sin descripción']);

        } else if (tipo === 'reserva') {
            // Tabla: reservas_estudiantes (actividad_id, usuario_id, estacion_id, titulo, nota_adicional)
            // Nota: estado_reserva se pone en 'pendiente' por defecto en la BD
            const queryHija = `
                INSERT INTO reservas_estudiantes (actividad_id, usuario_id, estacion_id, titulo, nota_adicional) 
                VALUES ($1, $2, $3, $4, $5)
            `;
            const estacionId = datosModal.estacion || null; // UUID de la estación de trabajo
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

const obtenerActividades = async () => {
    const client = await db.connect();
    try {
        // Modificamos los LEFT JOIN con los nombres reales de tus tablas hijas
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
/*
* Nuevo servicio para actualizar una actividad existente
*/
const actualizarActividad = async (idActividad, datosActualizados) => {
    const { tipo, laboratorio, fecha, desde, hasta, numPersonas, recurrencia } = datosActualizados;

    const inicioDatatime = new Date(`${fecha}T${desde}`);
    const finDatatime = new Date(`${fecha}T${hasta}`);

    let dbRecurrencia = 'no_repite';
    if (recurrencia === 'Todos los días' || recurrencia === 'Todos los dias') dbRecurrencia = 'diario';
    else if (recurrencia.includes('semana')) dbRecurrencia = 'semanal';
    else if (recurrencia.includes('mes')) dbRecurrencia = 'mensual';
    else if (recurrencia.includes('hábiles')) dbRecurrencia = 'dias_habiles';

    const client = await db.connect();
    try{
        await client.query('BEGIN');

        //Actualizar la tabla padre (actividades)
       const queryBase = `
            UPDATE actividades 
            SET laboratorio_id = $1, fecha_hora_inicio = $2, fecha_hora_fin = $3, recurrencia = $4
            WHERE id = $5
        `;
        await client.query(queryBase, [laboratorio, inicioDatatime, finDatatime, dbRecurrencia, idActividad]);

        //actualizar la tabla hija correspondiente según el tipo
        if(tipo === 'clase'){
            const queryHija = `
                UPDATE clases_academicas 
                SET materia = $1, docente = $2, num_estudiantes = $3
                WHERE actividad_id = $4
            `;
            await client.query(queryHija, [datosActualizados.materia, datosActualizados.num_estudiantes, idActividad]);
        }
        else if(tipo === 'mantenimiento'){
            const queryHija = `
                UPDATE mantenimientos 
                SET tecnico_id = $1, descripcion = $2
                WHERE actividad_id = $3
            `;
                await client.query(queryHija, [datosActualizados.tecnico_id, datosActualizados.descripcion, idActividad]);
            }
        else if(tipo === 'reserva'){
            const queryHija = `
                UPDATE reservas_estudiantes 
                SET estacion_id = $1, titulo = $2, nota_adicional = $3
                WHERE actividad_id = $4
            `;
            await client.query(queryHija, [datosActualizados.estacion_id, datosActualizados.titulo, datosActualizados.nota_adicional, idActividad]);
        }
        await client.query('COMMIT');
        return { exito: true, mensaje: 'Actividad actualizada exitosamente' };  
    }catch(error){
        await client.query('ROLLBACK');
        console.error('Error al actualizar actividad en el Service:', error);
        throw new Error('Error al actualizar la actividad. Por favor, inténtalo de nuevo.');
    }finally{
        if(client) client.release();
    }
}
module.exports = { programarActividad, obtenerActividades, actualizarActividad };