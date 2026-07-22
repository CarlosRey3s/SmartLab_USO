// ✅ Como debe quedar (Extrayendo el pool y renombrándolo a db)
const { pool: db } = require('../config/db');
const { rrulestr } = require('rrule');


/**
 * Función interna para verificar detalladamente los solapamientos de horarios y reglas de infraestructura.
 */
const verificarChoqueHorario = async (client, laboratorio_id, inicioDatetime, finDatetime, tipoNuevaActividad, datosModal, idActividadExcluir = null) => {

    // 1. Obtener estado Y modo de reserva del laboratorio
    const queryEstadoLab = `SELECT estado, modo_reserva FROM laboratorios WHERE id = $1`;
    const resEstadoLab = await client.query(queryEstadoLab, [laboratorio_id]);

    if (resEstadoLab.rows.length === 0) {
        throw new Error('El laboratorio seleccionado no existe.');
    }

    const { estado: estadoActualLab, modo_reserva: modoReservaLab } = resEstadoLab.rows[0];

    // Validaciones físicas del estado
    if (estadoActualLab === 'clausurado') {
        throw new Error('No se puede programar ninguna actividad porque el laboratorio está CLAUSURADO.');
    }
    if (estadoActualLab === 'en_mantenimiento' && tipoNuevaActividad !== 'mantenimiento') {
        throw new Error('El laboratorio está bajo mantenimiento físico. No se permiten clases ni reservas.');
    }

    // 1.5 [MODIFICADO] Soporte para múltiples estaciones
    let estacionesNuevas = [];
    if (Array.isArray(datosModal.estaciones) && datosModal.estaciones.length > 0) {
        estacionesNuevas = datosModal.estaciones.map(e => parseInt(e, 10));
    } else if (datosModal.estacion) {
        estacionesNuevas = [parseInt(datosModal.estacion, 10)];
    }

    if (tipoNuevaActividad === 'reserva') {
        if (modoReservaLab === 'espacio_completo') {
            estacionesNuevas = [null];
        }
        // Verificar cada estación seleccionada
        else if (modoReservaLab === 'por_estacion' && estacionesNuevas.length > 0) {
            for (const estId of estacionesNuevas) {
                if (estId === null) continue;
                const checkEstacion = await client.query(
                    `SELECT id FROM estaciones_trabajo WHERE id = $1 AND laboratorio_id = $2`,
                    [estId, laboratorio_id]
                );
                if (checkEstacion.rows.length === 0) {
                    throw new Error(`La estación de trabajo seleccionada no existe o no pertenece al laboratorio seleccionado.`);
                }
            }
        } else if (modoReservaLab === 'por_estacion' && estacionesNuevas.length === 0) {
            estacionesNuevas = [null];
        }
    }

    // 2. Consulta de choques en el mismo laboratorio
    let queryChoques = `
        SELECT a.id, a.tipo, 
               COALESCE(array_agg(res_est.estacion_id) FILTER (WHERE res_est.estacion_id IS NOT NULL), ARRAY[]::INTEGER[]) as estaciones
        FROM actividades a
        LEFT JOIN reserva_estaciones res_est ON a.id = res_est.actividad_id
        WHERE a.laboratorio_id = $1
          AND a.fecha_hora_inicio < $2 
          AND a.fecha_hora_fin > $3
    `;

    const parametros = [laboratorio_id, finDatetime, inicioDatetime];

    if (idActividadExcluir) {
        queryChoques += ` AND a.id != $4`;
        parametros.push(idActividadExcluir);
    }

    queryChoques += ` GROUP BY a.id, a.tipo`;

    const resChoques = await client.query(queryChoques, parametros);
    const actividadesConflictivas = resChoques.rows;

    if (actividadesConflictivas.length === 0) return; // Todo libre

    // 3. Evaluar conflictos según el modo de reserva
    if (tipoNuevaActividad === 'clase' || tipoNuevaActividad === 'mantenimiento') {
        const actEx = actividadesConflictivas[0];
        let tipoAmigable = actEx.tipo === 'clase' ? 'una Clase Académica' :
            (actEx.tipo === 'mantenimiento' ? 'un Mantenimiento Preventivo' : 'una Reserva de Estudiante');
        throw new Error(`El laboratorio ya está ocupado en este horario por ${tipoAmigable}.`);
    }

    else if (tipoNuevaActividad === 'reserva') {
        for (const act of actividadesConflictivas) {
            if (act.tipo === 'clase') {
                throw new Error('No puedes reservar porque el laboratorio estará ocupado por una Clase Académica.');
            }
            if (act.tipo === 'mantenimiento') {
                throw new Error('No puedes reservar porque el laboratorio estará bajo Mantenimiento.');
            }
            if (act.tipo === 'reserva') {
                // Si la reserva conflictiva es de espacio completo (array vacio) o queremos reservar completo (null)
                if (modoReservaLab === 'espacio_completo' || act.estaciones.length === 0 || estacionesNuevas.includes(null)) {
                    throw new Error('El laboratorio ya ha sido reservado en su totalidad por otro usuario en este horario.');
                }
                // Si es por estación, buscamos intersecciones
                if (modoReservaLab === 'por_estacion') {
                    const interseccion = estacionesNuevas.filter(e => act.estaciones.includes(e));
                    if (interseccion.length > 0) {
                        throw new Error('Una o más estaciones de trabajo seleccionadas ya están reservadas por otro estudiante en este horario.');
                    }
                }
            }
        }
    }
};

const formatearRecurrencia = (recurrenciaObj) => {
    if (!recurrenciaObj || typeof recurrenciaObj !== 'object') return null;

    const {frequency, interval, byDay} = recurrenciaObj;
    if(!frequency) return null;

    let parts = [`FREQ=${frequency}`];

    if(interval && interval > 1){
    parts.push(`INTERVAL=${interval}`);
    }

    if (Array.isArray(byDay) && byDay.length > 0) {
        parts.push(`BYDAY=${byDay.join(',')}`);
    }
    return parts.join(';');
};
/**
 * Función principal que llama el controlador
 */
const programarActividad = async (datosModal, idUsuarioLogueado) => {
    const { tipo, laboratorio, fecha, desde, hasta, numPersonas, recurrencia } = datosModal;

    // 1. Transformar las fechas y horas a formato DATETIME/TIMESTAMP
    const inicioDatetime = new Date(`${fecha}T${desde}`);
    const finDatetime = new Date(`${fecha}T${hasta}`);

    // Procesas dinamicamente el objeto JSON de recurrencia para convertirlo al formato RRULE estandar
    const reglaRecurrenciaPlana = formatearRecurrencia(recurrencia);

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
        const resultBase = await client.query(queryBase, [laboratorio, tipo, inicioDatetime, finDatetime, reglaRecurrenciaPlana]);
        const idGenerado = resultBase.rows[0]?.id;

        if (!idGenerado) {
            throw new Error("Fallo crítico: No se pudo obtener el ID de la nueva actividad.");
        }
        console.log("-> ID de actividad creado exitosamente:", idGenerado);

        // --- PASO B: Insertar en la tabla hija correspondiente según tu diseño ---
        if (tipo === 'clase') {
            const queryHija = `INSERT INTO clases_academicas (actividad_id, materia, docente_id, num_estudiantes) VALUES ($1, $2, $3, $4)`;
            const docenteId = datosModal.docente || idUsuarioLogueado;
            await client.query(queryHija, [idGenerado, datosModal.materia, docenteId, numPersonas]);
        } else if (tipo === 'mantenimiento') {
            const queryHija = `INSERT INTO mantenimientos (actividad_id, tecnico_id, descripcion_ti) VALUES ($1, $2, $3)`;
            const tecnicoId = datosModal.responsable || idUsuarioLogueado;
            await client.query(queryHija, [idGenerado, tecnicoId, datosModal.descripcion || 'Sin descripción']);
        } else if (tipo === 'reserva') {
            const queryHija = `INSERT INTO reservas_estudiantes (actividad_id, usuario_id, titulo, nota_adicional, estado_reserva) VALUES ($1, $2, $3, $4, $5)`;
            await client.query(queryHija, [idGenerado, idUsuarioLogueado, datosModal.titulo, datosModal.descripcion || null, 'aprobada']);

            const estaciones = Array.isArray(datosModal.estaciones) && datosModal.estaciones.length > 0
                ? datosModal.estaciones
                : (datosModal.estacion ? [datosModal.estacion] : []);

            if (estaciones.length > 0) {
                const queryEstacion = `INSERT INTO reserva_estaciones (actividad_id, estacion_id) VALUES ($1, $2)`;
                for (let est of estaciones) {
                    if (est && est !== 'null') {
                        await client.query(queryEstacion, [idGenerado, parseInt(est, 10)]);
                    }
                }
            }
        }
        // --- PASO C: Insertar items de inventario si los hay ---
        if (datosModal.equipos && Array.isArray(datosModal.equipos) && datosModal.equipos.length > 0) {
            const queryItem = `INSERT INTO reserva_items (actividad_id, item_id, cantidad_solicitada) VALUES ($1, $2, $3)`;
            for (const equipo of datosModal.equipos) {
                await client.query(queryItem, [idGenerado, equipo.id, equipo.cantidad || 1]);
            }
        }
        await client.query('COMMIT');
        return { exito: true, mensaje: 'Actividad programada exitosamente', id: idGenerado };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al programar actividad en el Service:', error);
        throw new Error(error.message || 'Error al programar la actividad. Por favor, inténtalo de nuevo.');
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
    if (typeof recurrencia === 'string' && (recurrencia === 'Todos los días' || recurrencia === 'Todos los dias')) dbRecurrencia = 'diario';
    else if (typeof recurrencia === 'string' && recurrencia.includes('semana')) dbRecurrencia = 'semanal';
    else if (typeof recurrencia === 'string' && recurrencia.includes('mes')) dbRecurrencia = 'mensual';
    else if (typeof recurrencia === 'string' && recurrencia.includes('hábiles')) dbRecurrencia = 'dias_habiles';

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
            const queryHija = `UPDATE reservas_estudiantes SET titulo = $1, nota_adicional = $2 WHERE actividad_id = $3`;
            await client.query(queryHija, [datosModal.titulo, datosModal.descripcion || null, idActividad]);

            // Eliminar y re-insertar estaciones
            await client.query(`DELETE FROM reserva_estaciones WHERE actividad_id = $1`, [idActividad]);

            const estaciones = Array.isArray(datosModal.estaciones) && datosModal.estaciones.length > 0
                ? datosModal.estaciones
                : (datosModal.estacion ? [datosModal.estacion] : []);

            if (estaciones.length > 0) {
                const queryEstacion = `INSERT INTO reserva_estaciones (actividad_id, estacion_id) VALUES ($1, $2)`;
                for (let est of estaciones) {
                    if (est && est !== 'null') {
                        await client.query(queryEstacion, [idActividad, parseInt(est, 10)]);
                    }
                }
            }
        }

        // Si se están mandando equipos actualizados, reemplazamos los anteriores
        if (datosModal.equipos && Array.isArray(datosModal.equipos)) {
            // Eliminar los anteriores
            await client.query(`DELETE FROM reserva_items WHERE actividad_id = $1`, [idActividad]);
            // Insertar los nuevos
            const queryItem = `INSERT INTO reserva_items (actividad_id, item_id, cantidad_solicitada) VALUES ($1, $2, $3)`;
            for (const equipo of datosModal.equipos) {
                await client.query(queryItem, [idActividad, equipo.id, equipo.cantidad || 1]);
            }
        }

        await client.query('COMMIT');
        return { exito: true, mensaje: 'Actividad actualizada exitosamente' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar actividad en el Service:', error);
        throw new Error(error.message || 'Error al actualizar la actividad. Por favor, inténtalo de nuevo.');
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
        // Usamos ARRAY_AGG y GROUP BY para consolidar todas las PCs en una sola fila
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
                
                -- Datos del Laboratorio
                a.laboratorio_id,
                l.nombre AS laboratorio_nombre,
                l.coordinador_id,
                
                -- Datos de Clase
                ca.materia, 
                ca.docente_id, 
                u_docente.nombre AS docente_nombre,
                ca.num_estudiantes AS clase_estudiantes,
                
                -- Datos de Mantenimiento
                m.tecnico_id AS tecnico_responsable, 
                u_tecnico.nombre AS tecnico_nombre,
                m.descripcion_ti AS mant_descripcion,
                
                -- Datos de Reserva Estudiantil
                re.titulo AS reserva_titulo,
                re.nota_adicional AS reserva_nota,
                re.estado_reserva,
                re.usuario_id AS reserva_usuario_id,
                
                -- 1. Subconsulta para agrupar las estaciones en un Array
                (
                    SELECT COALESCE(array_agg(estacion_id), '{}') 
                    FROM reserva_estaciones 
                    WHERE actividad_id = a.id
                ) AS estaciones,
                 
                -- 2. Subconsulta para agrupar los equipos en un Array de Objetos JSON
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'id', ii.id, 
                                'nombre', ii.nombre, 
                                'cantidad', ri.cantidad_solicitada
                            )
                        ), '[]'::json
                    ) 
                    FROM reserva_items ri 
                    INNER JOIN item_inventario ii ON ri.item_id = ii.id 
                    WHERE ri.actividad_id = a.id
                ) AS equipos

            FROM actividades a
            
            -- Uniones para traer los nombres reales
            LEFT JOIN laboratorios l ON a.laboratorio_id = l.id
            LEFT JOIN clases_academicas ca ON a.id = ca.actividad_id
            LEFT JOIN usuarios u_docente ON ca.docente_id = u_docente.id
            LEFT JOIN mantenimientos m ON a.id = m.actividad_id
            LEFT JOIN usuarios u_tecnico ON m.tecnico_id = u_tecnico.id
            LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id;
        `;
        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error al obtener actividades:', error);
        throw new Error('Error al obtener las actividades.');
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
        await client.query('BEGIN');

        //antes de borrar, obtenemos a que laboratorio pertenece y a que tipo de actividad es
        const querySelect = `SELECT laboratorio_id, tipo FROM actividades WHERE id = $1`;
        const resSelect = await client.query(querySelect, [idActividad]);
        if (resSelect.rows.length === 0) {
            throw new Error('La actividad que intentas eliminar no existe.');
        }
        const { laboratorio_id, tipo } = resSelect.rows[0];

        // ejecutar eliminacion gracias al cascade limpia tablas hijas automaticamen
        const queryDelete = `DELETE FROM actividades WHERE id = $1`;
        await client.query(queryDelete, [idActividad]);

        //Logica inteligente para mantenimientos
        if (tipo === 'mantenimiento') {
            //verificamos si quedan otros mantenimientos activos para este laboratorio
            const checkMantenimientos = await client.query(
                `SELECT id FROM actividades WHERE laboratorio_id = $1 AND tipo = 'mantenimiento'`,
                [laboratorio_id]
            );

            // si ya no hay mas mantenimientos programados, entonces si liberamos el laboratorio
            if (checkMantenimientos.rows.length === 0) {
                await client.query(
                    `UPDATE laboratorios SET estado = 'disponible' WHERE id = $1`,
                    [laboratorio_id]
                );
                console.log(`-> Mantenimiento eliminado. Estado del laboratorio ${laboratorio_id} devuelto a 'disponible'`);
            } else {
                console.log(`-> Mantenimiento eliminado, pero el lab ${laboratorio_id} sigue en mantenimiento por otras actividades pendientes.`);
            }
        }
        await client.query('COMMIT');
        return { exito: true, mensaje: 'Actividad eliminada exitosamente y estados sincronizados.' };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar actividad en el Service:', error);
        throw new Error('Error al eliminar la actividad. Por favor, inténtalo de nuevo.');
    } finally {
        if (client) client.release();
    }
};

const obtenerDisponibilidad = async (laboratorio, fecha, horaInicio, horaFin, idActividad = null) => {
    const inicioDatetime = new Date(`${fecha}T${horaInicio}`);
    const finDatetime = new Date(`${fecha}T${horaFin}`);
    const client = await db.connect();

    try {
        // 1 verificar si hay un " bloque total"
        let queryBloqueo = `
            SELECT a.tipo
            FROM actividades a
            WHERE a.laboratorio_id = $1
              AND a.fecha_hora_inicio < $2 
              AND a.fecha_hora_fin > $3
        `;
        let params = [laboratorio, finDatetime, inicioDatetime];

        if (idActividad) {
            queryBloqueo += ` AND a.id != $4`;
            params.push(idActividad);
        }
        const resBloqueo = await client.query(queryBloqueo, params);

        // si hay una clase o mantenimiento solapado, el alb esta 100% bloqueado

        for (const act of resBloqueo.rows) {
            if (act.tipo === 'clase' || act.tipo === 'mantenimiento') {
                return { bloqueoTotal: true, estacionesOcupadas: [] };
            }
        }

        // 2. Si el lab no está bloqueado totalmente, buscar las PCs específicas reservadas
        let queryEstaciones = `
            SELECT re_est.estacion_id
            FROM actividades a
            INNER JOIN reserva_estaciones re_est ON a.id = re_est.actividad_id
            WHERE a.laboratorio_id = $1
              AND a.fecha_hora_inicio < $2 
              AND a.fecha_hora_fin > $3
        `;

        if (idActividad) {
            queryEstaciones += ` AND a.id != $4`;
        }

        const resEstaciones = await client.query(queryEstaciones, params);
        const estacionesOcupadas = resEstaciones.rows.map(row => row.estacion_id);
        return { bloqueoTotal: false, estacionesOcupadas };
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        throw new Error('Error al consultar disponibilidad.');
    } finally {
        if (client) client.release();
    }
}

/**
 * Extrae las actividades de la BD y expande las recurrentes en el rango de fechas solicitado
 */
const obtenerActividadesExpandidas = async (fechaInicioVista, fechaFinVista) => {
    const client = await db.connect();
    
    try {
        // 1. Convertir los strings de fecha del frontend a objetos Date en Node
        const startVista = new Date(fechaInicioVista);
        const endVista = new Date(fechaFinVista);

        // 2. Consulta SQL Estratégica: Trae eventos normales de este mes, Y eventos recurrentes que empezaron antes o durante este mes
        const query = `
            SELECT a.*, 
                   c.materia, c.docente_id, c.num_estudiantes,
                   m.tecnico_id, m.descripcion_ti,
                   r.usuario_id AS id_solicitante, r.titulo, r.estado_reserva
            FROM actividades a
            LEFT JOIN clases_academicas c ON a.id = c.actividad_id
            LEFT JOIN mantenimientos m ON a.id = m.actividad_id
            LEFT JOIN reservas_estudiantes r ON a.id = r.actividad_id
            WHERE (a.recurrencia IS NULL AND a.fecha_hora_inicio <= $2 AND a.fecha_hora_fin >= $1)
               OR (a.recurrencia IS NOT NULL AND a.fecha_hora_inicio <= $2)
        `;
        
        const { rows } = await client.query(query, [endVista, startVista]);
        const eventosListosParaReact = [];

        // 3. El Motor de Expansión
        for (const fila of rows) {
            if (!fila.recurrencia) {
                // CASO A: Evento Normal ("No se repite")
                // Se envía tal cual, pero le creamos un id_instancia por si acaso
                fila.id_instancia = fila.id.toString(); 
                eventosListosParaReact.push(fila);
            } else {
                // CASO B: Evento Recurrente (La Magia del RRULE)
                
                const fechaInicioOriginal = new Date(fila.fecha_hora_inicio);
                const fechaFinOriginal = new Date(fila.fecha_hora_fin);
                
                // Calculamos cuánto dura la clase original (ej. 2 horas = 7,200,000 milisegundos)
                const duracionMilisegundos = fechaFinOriginal.getTime() - fechaInicioOriginal.getTime();

                // Construimos la regla matemática usando el string de la BD y su fecha de inicio original
                const regla = rrulestr(fila.recurrencia, {
                    dtstart: fechaInicioOriginal
                });

                // between() genera un arreglo con TODAS las fechas clonadas que caen en este mes
                const fechasClonadas = regla.between(startVista, endVista, true); // true = incluye los límites

                // Generamos los cuadritos visuales para React
                for (const fechaClon of fechasClonadas) {
                    // Clonamos toda la información de la fila original (materia, docente, laboratorio, etc.)
                    const eventoClonado = { ...fila };
                    
                    // Sobrescribimos el inicio y fin con las nuevas fechas de la expansión
                    eventoClonado.fecha_hora_inicio = fechaClon;
                    eventoClonado.fecha_hora_fin = new Date(fechaClon.getTime() + duracionMilisegundos);
                    
                    // [CLAVE PARA REACT]: Le damos una llave única que combina el ID real de BD y la fecha clonada
                    // Esto evita que React colapse al ver múltiples eventos con el "id: 32"
                    eventoClonado.id_instancia = `${fila.id}-${fechaClon.getTime()}`;

                    eventosListosParaReact.push(eventoClonado);
                }
            }
        }

        return eventosListosParaReact;

    } catch (error) {
        console.error('Error procesando la expansión de eventos:', error);
        throw new Error('Error al procesar las actividades del calendario.');
    } finally {
        client.release();
    }
};

module.exports = {
    // ...tus otras exportaciones
    obtenerActividadesExpandidas
};

module.exports = {
    programarActividad,
    obtenerActividades,
    actualizarActividad,
    eliminarActividad,
    obtenerDisponibilidad,
    obtenerActividadesExpandidas
};