const { pool: db } = require('../config/db');
const { rrulestr } = require('rrule');
const { crearAlerta } = require('./alertas.service');

const ZONA_HORARIA = 'America/El_Salvador';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
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
        SELECT a.id, a.tipo, re.estado_reserva,
               COALESCE(array_agg(res_est.estacion_id) FILTER (WHERE res_est.estacion_id IS NOT NULL), ARRAY[]::INTEGER[]) as estaciones
        FROM actividades a
        LEFT JOIN reserva_estaciones res_est ON a.id = res_est.actividad_id
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1
          AND a.fecha_hora_inicio < $2 
          AND a.fecha_hora_fin > $3
          -- Solo evaluamos conflicto si es Clase, Mantenimiento o una Reserva 'aprobada'
          AND (a.tipo IN ('clase', 'mantenimiento') OR re.estado_reserva = 'aprobada')`;
    const parametros = [laboratorio_id, finDatetime, inicioDatetime];

    if (idActividadExcluir) {
        queryChoques += ` AND a.id != $4`;
        parametros.push(idActividadExcluir);
    }

    queryChoques += ` GROUP BY a.id, a.tipo, re.estado_reserva`;

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

/**
 * Verifica si hay stock disponible para los equipos solicitados en el rango de fechas,
 * considerando las reservas futuras que ya están programadas (aprobadas o pendientes)
 * y que se cruzan en tiempo, para NO sobre-prometer inventario.
 */
const verificarDisponibilidadItems = async (client, inicioDatetime, finDatetime, equiposSolicitados, idActividadExcluir = null) => {
    if (!equiposSolicitados || equiposSolicitados.length === 0) return;

    for (const equipo of equiposSolicitados) {
        const itemId = equipo.id;
        const cantPedida = parseInt(equipo.cantidad || 1, 10);

        // 1. Consultar Stock Físico (cantidad_actual)
        const queryItem = `SELECT nombre, cantidad_actual FROM item_inventario WHERE id = $1`;
        const resItem = await client.query(queryItem, [itemId]);
        if (resItem.rows.length === 0) throw new Error(`El equipo con ID ${itemId} no existe en el inventario.`);

        const itemInfo = resItem.rows[0];
        const stockFisico = parseInt(itemInfo.cantidad_actual, 10);

        // 2. Sumar la cantidad comprometida en reservas concurrentes (que aún no se han entregado)
        let queryChoques = `
            SELECT COALESCE(SUM(ri.cantidad_solicitada), 0) as comprometidos
            FROM actividades a
            JOIN reserva_items ri ON a.id = ri.actividad_id
            LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
            WHERE ri.item_id = $1
              AND a.fecha_hora_inicio < $2 
              AND a.fecha_hora_fin > $3
              -- Solo nos importan reservas que separan stock pero NO lo han retirado físicamente aún
              AND (re.estado_reserva IN ('pendiente', 'aprobada'))
        `;
        const params = [itemId, finDatetime, inicioDatetime];

        if (idActividadExcluir) {
            queryChoques += ` AND a.id != $4`;
            params.push(idActividadExcluir);
        }

        const resChoques = await client.query(queryChoques, params);
        const comprometidos = parseInt(resChoques.rows[0].comprometidos, 10);

        // 3. Evaluar Disponibilidad Proyectada
        const disponibleProyectado = stockFisico - comprometidos;

        if (cantPedida > disponibleProyectado) {
            throw new Error(`Para el horario seleccionado, solo tenemos ${Math.max(0, disponibleProyectado)} unidades disponibles de "${itemInfo.nombre}". Se están ocupando ${comprometidos} en otras reservas cruzadas.`);
        }
    }
};

const formatearRecurrencia = (recurrenciaObj) => {
    if (!recurrenciaObj || typeof recurrenciaObj !== 'object') return null;

    const { frequency, interval, byDay, byMonthDay, count, until } = recurrenciaObj;
    if (!frequency) return null;

    let parts = [`FREQ=${frequency}`];

    if (interval && interval > 1) {
        parts.push(`INTERVAL=${interval}`);
    }

    if (Array.isArray(byDay) && byDay.length > 0) {
        parts.push(`BYDAY=${byDay.join(',')}`);
    }

    if (byMonthDay) {
        parts.push(`BYMONTHDAY=${byMonthDay}`);
    }

    if (count && count > 0) {
        parts.push(`COUNT=${count}`);
    } else if (until) {
        const untilDate = new Date(until);
        if (!isNaN(untilDate.getTime())) {
            const y = untilDate.getFullYear();
            const m = String(untilDate.getMonth() + 1).padStart(2, '0');
            const d = String(untilDate.getDate()).padStart(2, '0');
            parts.push(`UNTIL=${y}${m}${d}T235959Z`);
        }
    }

    return parts.join(';');
};
/**
 * Función principal que llama el controlador
 */
const programarActividad = async (datosModal, usuarioLogueado) => {
    const { tipo, laboratorio, fecha, desde, hasta, numPersonas, recurrencia } = datosModal;

    // 1. Extraemos id y rol del objeto usuarioLogueado (Ya no es solo un ID)
    const idUsuario = usuarioLogueado.id;
    const rolUsuario = usuarioLogueado.rol;

    // 2. Transformar las fechas y horas a formato DATETIME/TIMESTAMP
    const inicioDatetime = dayjs.tz(`${fecha} ${desde}`, ZONA_HORARIA).toDate();
    const finDatetime = dayjs.tz(`${fecha} ${hasta}`, ZONA_HORARIA).toDate();


    // Procesas dinamicamente el objeto JSON de recurrencia
    const reglaRecurrenciaPlana = formatearRecurrencia(recurrencia);

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // [VALIDACIÓN CRÍTICA]: Ejecutar el árbol lógico de choques de horarios e infraestructura
        await verificarChoqueHorario(client, laboratorio, inicioDatetime, finDatetime, tipo, datosModal);

        // [NUEVA VALIDACIÓN CRÍTICA]: Choques de Inventario Proyectado
        if (datosModal.equipos && Array.isArray(datosModal.equipos) && datosModal.equipos.length > 0) {
            await verificarDisponibilidadItems(client, inicioDatetime, finDatetime, datosModal.equipos);
        }

        // Si la nueva actividad es un mantenimiento, actualizamos físicamente el estado
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

        // --- PASO B: Insertar en la tabla hija correspondiente ---
        if (tipo === 'clase') {
            const queryHija = `INSERT INTO clases_academicas (actividad_id, materia, docente_id, num_estudiantes) VALUES ($1, $2, $3, $4)`;
            // Usamos idUsuario extraído arriba
            const docenteId = datosModal.docente || idUsuario;
            await client.query(queryHija, [idGenerado, datosModal.materia, docenteId, numPersonas]);

        } else if (tipo === 'mantenimiento') {
            const queryHija = `INSERT INTO mantenimientos (actividad_id, tecnico_id, descripcion_ti) VALUES ($1, $2, $3)`;
            // Usamos idUsuario extraído arriba
            const tecnicoId = datosModal.responsable || idUsuario;
            await client.query(queryHija, [idGenerado, tecnicoId, datosModal.descripcion || 'Sin descripción']);

        } else if (tipo === 'reserva') {

            // LÓGICA DE ROLES: Dependiendo del rol, pasa a pendiente o aprobada automáticamente
            const estadoInicial = (rolUsuario === 'administrador' || rolUsuario === 'coordinador') ? 'aprobada' : 'pendiente';

            const queryHija = `INSERT INTO reservas_estudiantes (actividad_id, usuario_id, titulo, nota_adicional, estado_reserva) VALUES ($1, $2, $3, $4, $5)`;
            await client.query(queryHija, [idGenerado, idUsuario, datosModal.titulo, datosModal.nota_adicional || null, estadoInicial]);

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

        // Mensaje dinámico de respuesta al frontend
        const mensajeRespuesta = (tipo === 'reserva' && (rolUsuario === 'estudiante' || rolUsuario === 'docente'))
            ? 'Solicitud de reserva enviada exitosamente. Quedará en espera de aprobación por el coordinador.'
            : 'Actividad programada exitosamente';

        return { exito: true, mensaje: mensajeRespuesta, id: idGenerado };

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

    // CORRECCIÓN: construir la fecha explícitamente en la zona horaria de El Salvador
    // en vez de depender del TZ implícito del proceso de Node
    const inicioDatetime = dayjs.tz(`${fecha} ${desde}`, ZONA_HORARIA).toDate();
    const finDatetime = dayjs.tz(`${fecha} ${hasta}`, ZONA_HORARIA).toDate();

    // CORRECCIÓN HUECO 4: Usar la misma función que al crear para guardar el RRULE válido
    const dbRecurrencia = formatearRecurrencia(recurrencia);

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
            await client.query(queryHija, [datosModal.titulo, datosModal.nota_adicional || null, idActividad]);

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

const obtenerDisponibilidad = async (laboratorioId, fechaInicio, fechaFin, excludeId = null) => {
    // =========================================================================
    // 1. Verificar si hay un evento que bloquee TODO el laboratorio 
    // (Ej. Clases, Mantenimientos o reservas del espacio completo)
    // =========================================================================
    console.log('DEBUG disponibilidad:', { laboratorioId, fechaInicio, fechaFin, excludeId });

    console.log('DEBUG disponibilidad:', { laboratorioId, fechaInicio, fechaFin, excludeId });

    if (!laboratorioId || !fechaInicio || !fechaFin) {
        throw new Error(`Parámetros inválidos: ${JSON.stringify({ laboratorioId, fechaInicio, fechaFin })}`);
    }
    let queryBloqueo = `
        SELECT a.tipo 
        FROM actividades a
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1 
          AND a.fecha_hora_inicio < $3 
          AND a.fecha_hora_fin > $2
          AND (a.tipo != 'reserva' OR re.estado_reserva NOT IN ('cancelada', 'rechazada'))
    `;
    const paramsBloqueo = [laboratorioId, fechaInicio, fechaFin];
    if (excludeId) {
        queryBloqueo += ` AND a.id != $4`;
        paramsBloqueo.push(excludeId);
    }
    const resultBloqueo = await db.query(queryBloqueo, paramsBloqueo);

    // Si detectamos clases o mantenimientos, el laboratorio entero está bloqueado
    const bloqueoTotal = resultBloqueo.rows.find(row => row.tipo === 'clase' || row.tipo === 'mantenimiento');
    if (bloqueoTotal) {
        return { disponible: false, motivo: `El laboratorio está ocupado por: ${bloqueoTotal.tipo}`, estacionesOcupadas: [], itemsOcupados: {} };
    }

    // =========================================================================
    // 2. Obtener las Estaciones Ocupadas en ese rango de tiempo
    // =========================================================================
    let queryEstaciones = `
        SELECT res_est.estacion_id 
        FROM reserva_estaciones res_est
        JOIN actividades a ON res_est.actividad_id = a.id
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1 
          AND a.fecha_hora_inicio < $3 
          AND a.fecha_hora_fin > $2
          AND (a.tipo != 'reserva' OR re.estado_reserva NOT IN ('cancelada', 'rechazada'))
    `;
    const paramsEstaciones = [laboratorioId, fechaInicio, fechaFin];
    if (excludeId) {
        queryEstaciones += ` AND a.id != $4`;
        paramsEstaciones.push(excludeId);
    }
    const resultEstaciones = await db.query(queryEstaciones, paramsEstaciones);
    const estacionesOcupadas = resultEstaciones.rows.map(r => r.estacion_id);

    // =========================================================================
    // 3. Obtener el Inventario Ocupado en ese rango de tiempo
    // =========================================================================
    let queryItems = `
        SELECT ri.item_id, SUM(ri.cantidad_solicitada) as total_ocupado
        FROM reserva_items ri
        JOIN actividades a ON ri.actividad_id = a.id
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1 
          AND a.fecha_hora_inicio < $3 
          AND a.fecha_hora_fin > $2
          AND (a.tipo != 'reserva' OR re.estado_reserva NOT IN ('cancelada', 'rechazada'))
    `;
    const paramsItems = [laboratorioId, fechaInicio, fechaFin];
    if (excludeId) {
        queryItems += ` AND a.id != $4`;
        paramsItems.push(excludeId);
    }
    queryItems += ` GROUP BY ri.item_id`;


    const resultItems = await db.query(queryItems, paramsItems);

    // Transformamos el resultado en un objeto clave-valor { id_item: cantidad_ocupada }
    const itemsOcupados = {};
    resultItems.rows.forEach(r => {
        itemsOcupados[r.item_id] = parseInt(r.total_ocupado, 10);
    });

    // Retornamos el reporte completo de disponibilidad
    return {
        disponible: true,
        estacionesOcupadas,
        itemsOcupados
    };
};

/**
 * Extrae las actividades con toda su infraestructura agrupada (PCs, Inventario, Nombres)
 * y expande dinámicamente las instancias recurrentes (RRULE) dentro del rango de la vista del calendario.
 */
const obtenerActividadesExpandidas = async (fechaInicioVista, fechaFinVista, usuarioId, rol) => {
    const client = await db.connect();

    try {
        const startVista = new Date(fechaInicioVista);
        const endVista = new Date(fechaFinVista);

        const query = `
            SELECT 
                a.id, 
                
                -- Asignación limpia de títulos
                CASE 
                    WHEN a.tipo = 'clase' THEN ca.materia
                    WHEN a.tipo = 'mantenimiento' THEN 'Laboratorio en Mantenimiento'
                    WHEN a.tipo = 'reserva' THEN re.titulo
                    ELSE 'Actividad'
                END AS title, 
                
                a.fecha_hora_inicio AS start, 
                a.fecha_hora_fin AS end, 
                a.tipo,
                a.recurrencia,
                
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
                u_reserva.nombre AS reserva_solicitante_nombre,
                u_reserva.apellido AS reserva_solicitante_apellido,
                u_reserva.expediente AS reserva_solicitante_expediente,
                
                -- Subconsulta para estaciones
                (
                    SELECT COALESCE(array_agg(estacion_id), '{}') 
                    FROM reserva_estaciones 
                    WHERE actividad_id = a.id
                ) AS estaciones,
                 
                -- Subconsulta para equipos
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
            
            LEFT JOIN laboratorios l ON a.laboratorio_id = l.id
            LEFT JOIN clases_academicas ca ON a.id = ca.actividad_id
            LEFT JOIN usuarios u_docente ON ca.docente_id = u_docente.id
            LEFT JOIN mantenimientos m ON a.id = m.actividad_id
            LEFT JOIN usuarios u_tecnico ON m.tecnico_id = u_tecnico.id
            LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
            LEFT JOIN usuarios u_reserva ON re.usuario_id = u_reserva.id

            WHERE (
                (a.recurrencia IS NULL AND a.fecha_hora_inicio <= $2 AND a.fecha_hora_fin >= $1)
                OR (a.recurrencia IS NOT NULL AND a.fecha_hora_inicio <= $2)
            )
            -- 🚀 MATRIZ DE CONTROL DE ACCESO (RBAC + DOMINIO)
            AND (
                -- 1. administrador: Ve absolutamente todo el campus
                $4 = 'administrador'
                
                -- 2. coordinador / docente: Solo ve laboratorios a su cargo o sus propias clases
                OR (
                    $4 = 'coordinador' AND (
                        l.coordinador_id = $3 
                        OR ca.docente_id = $3
                    )
                )
                
                -- 3. estudiante: Ve sus clases, mantenimientos y únicamente sus reservas
                OR (
                    $4 = 'estudiante' AND (
                        a.tipo = 'clase'
                        OR a.tipo = 'mantenimiento'
                        OR (a.tipo = 'reserva' AND re.usuario_id = $3 AND re.estado_reserva = 'aprobada')
                    )
                )
            );
        `;

        const { rows } = await client.query(query, [startVista, endVista, usuarioId, rol]);
        const eventosListosParaReact = [];

        // Motor de expansión RRule (sin cambios)
        for (const fila of rows) {
            if (!fila.recurrencia) {
                fila.id_instancia = fila.id.toString();
                eventosListosParaReact.push(fila);
            } else {
                const fechaInicioOriginal = new Date(fila.start);
                const fechaFinOriginal = new Date(fila.end);
                const duracionMilisegundos = fechaFinOriginal.getTime() - fechaInicioOriginal.getTime();

                try {
                    const regla = rrulestr(fila.recurrencia, {
                        dtstart: fechaInicioOriginal
                    });

                    const fechasClonadas = regla.between(startVista, endVista, true);

                    for (const fechaClon of fechasClonadas) {
                        const eventoClonado = { ...fila };
                        eventoClonado.start = fechaClon;
                        eventoClonado.end = new Date(fechaClon.getTime() + duracionMilisegundos);
                        eventoClonado.id_instancia = `${fila.id}-${fechaClon.getTime()}`;

                        eventosListosParaReact.push(eventoClonado);
                    }
                } catch (rruleError) {
                    console.warn(`[Advertencia] Error RRule ID ${fila.id}:`, rruleError.message);
                }
            }
        }

        return eventosListosParaReact;

    } catch (error) {
        console.error('Error procesando la expansión de eventos estructurados:', error);
        throw new Error('Error al procesar las actividades completas del calendario.');
    } finally {
        if (client) client.release();
    }
};

// ==========================================
// OBTENER TODAS LAS SOLICITUDES — Paginado + RBAC + Contadores
// ==========================================
const obtenerTodasSolicitudes = async (usuarioId, rol, estado = null, page = 1, limit = 10) => {
    // Se deshabilita la actualización automática a 'incompleto' por problemas de zona horaria y desaparición de solicitudes.
    // try {
    //     await db.query(`ALTER TYPE estado_reserva_enum ADD VALUE IF NOT EXISTS 'incompleto'`);
    //     await db.query(`
    //         UPDATE reservas_estudiantes r
    //         SET estado_reserva = 'incompleto'
    //         FROM actividades a
    //         WHERE r.actividad_id = a.id
    //           AND r.estado_reserva = 'pendiente'
    //           AND a.fecha_hora_fin < NOW()
    //     `);
    // } catch (e) {
    //     console.warn('Advertencia al actualizar reservas incompletas:', e.message);
    // }

    // Fragmentos compartidos entre las queries
    const baseFrom = `
        FROM reservas_estudiantes r
        JOIN actividades a ON r.actividad_id = a.id
        JOIN usuarios u ON r.usuario_id = u.id
        JOIN laboratorios l ON a.laboratorio_id = l.id
    `;

    const rbacWhere = `
        WHERE (
            LOWER($2) = 'administrador'
            OR (LOWER($2) = 'coordinador' AND l.coordinador_id = $1)
            OR r.usuario_id = $1
        )
    `;

    const baseParams = [usuarioId, rol];

    // 1. Contadores por estado (para los badges de las tabs)
    const contadoresQuery = `
        SELECT r.estado_reserva, COUNT(*) as cantidad
        ${baseFrom}
        ${rbacWhere}
        GROUP BY r.estado_reserva
    `;
    const contadoresResult = await db.query(contadoresQuery, baseParams);
    const contadores = {};
    contadoresResult.rows.forEach(row => {
        contadores[row.estado_reserva] = parseInt(row.cantidad, 10);
    });

    // 2. Construir parámetros dinámicos para la query paginada
    const dataParams = [...baseParams];
    let paramIndex = 3;
    let estadoFilter = '';

    if (estado) {
        estadoFilter = ` AND r.estado_reserva = $${paramIndex}`;
        dataParams.push(estado);
        paramIndex++;
    }

    const limitParam = `$${paramIndex}`;
    const offsetParam = `$${paramIndex + 1}`;
    dataParams.push(limit, (page - 1) * limit);

    // 3. Query principal con paginación
    const dataQuery = `
        SELECT 
            r.actividad_id,
            r.titulo,
            r.nota_adicional,
            r.estado_reserva,
            a.fecha_hora_inicio,
            a.fecha_hora_fin,
            a.fecha_creacion,
            u.nombre AS solicitante_nombre,
            u.apellido AS solicitante_apellido,
            u.correo AS solicitante_correo,
            u.expediente AS solicitante_expediente,
            u.rol AS solicitante_rol,
            l.nombre AS laboratorio_nombre,
            l.edificio,
            l.aula,
            (r.usuario_id = $1) AS es_propia,
            (
                SELECT COALESCE(json_agg(json_build_object('id', e.id, 'nombre', e.nombre)), '[]')
                FROM reserva_estaciones re 
                JOIN estaciones_trabajo e ON re.estacion_id = e.id 
                WHERE re.actividad_id = r.actividad_id
            ) AS estaciones,
            (
                SELECT COALESCE(json_agg(json_build_object('id', i.id, 'nombre', i.nombre, 'cantidad', ri.cantidad_solicitada)), '[]')
                FROM reserva_items ri 
                JOIN item_inventario i ON ri.item_id = i.id 
                WHERE ri.actividad_id = r.actividad_id
            ) AS inventario
        ${baseFrom}
        ${rbacWhere}
        ${estadoFilter}
        ORDER BY a.fecha_creacion DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const { rows } = await db.query(dataQuery, dataParams);

    // 4. Calcular total para la paginación
    let total;
    if (estado && contadores[estado] !== undefined) {
        total = contadores[estado];
    } else if (!estado) {
        total = Object.values(contadores).reduce((sum, val) => sum + val, 0);
    } else {
        total = 0;
    }

    return {
        solicitudes: rows,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / limit) || 1,
        contadores
    };
};

// ==========================================
// 2. RESOLVER SOLICITUD (PUT - APROBAR/RECHAZAR)
// ==========================================
const resolverSolicitud = async (actividadId, accion, resolutorId) => {
    // 1. Verificar el estado actual de la solicitud
    const estadoQuery = await db.query(
        `SELECT r.estado_reserva, a.laboratorio_id, a.fecha_hora_inicio, a.fecha_hora_fin 
         FROM reservas_estudiantes r
         JOIN actividades a ON r.actividad_id = a.id
         WHERE r.actividad_id = $1`,
        [actividadId]
    );

    if (estadoQuery.rows.length === 0) {
        throw { status: 404, message: 'La solicitud no existe.' };
    }

    const reserva = estadoQuery.rows[0];

    // Regla de Negocio: El primero que actúe, cierra.
    if (reserva.estado_reserva !== 'pendiente') {
        throw { status: 400, message: `Esta solicitud ya fue resuelta. Estado actual: ${reserva.estado_reserva}` };
    }

    // 2. FLUJO A: RECHAZAR
    if (accion === 'rechazar') {
        await db.query(
            `UPDATE reservas_estudiantes 
             SET estado_reserva = 'rechazada', resuelto_por = $1, fecha_resolucion = CURRENT_TIMESTAMP 
             WHERE actividad_id = $2`,
            [resolutorId, actividadId]
        );
        return { message: 'Solicitud rechazada correctamente.' };
    }

    // 3. FLUJO B: APROBAR (Con tu corrección de validación de choques)
    if (accion === 'aprobar') {
        // Validamos choques SOLO contra clases, mantenimientos, o reservas APROBADAS
        const choqueQuery = `
            SELECT a_existente.id 
            FROM actividades a_existente
            LEFT JOIN reservas_estudiantes r_existente ON a_existente.id = r_existente.actividad_id
            WHERE a_existente.laboratorio_id = $1
              AND a_existente.id != $2
              AND (a_existente.fecha_hora_inicio < $4 AND a_existente.fecha_hora_fin > $3)
              AND (a_existente.tipo IN ('clase', 'mantenimiento') OR r_existente.estado_reserva = 'aprobada')
            LIMIT 1;
        `;

        const validacion = await db.query(choqueQuery, [
            reserva.laboratorio_id,
            actividadId,
            reserva.fecha_hora_inicio,
            reserva.fecha_hora_fin
        ]);

        if (validacion.rows.length > 0) {
            throw { status: 409, message: 'No es posible aprobar la solicitud. Se detectó un choque de horario con una actividad aprobada recientemente.' };
        }

        // Si no hay choque, aprobamos
        await db.query(
            `UPDATE reservas_estudiantes 
             SET estado_reserva = 'aprobada', resuelto_por = $1, fecha_resolucion = CURRENT_TIMESTAMP 
             WHERE actividad_id = $2`,
            [resolutorId, actividadId]
        );
        return { message: 'Solicitud aprobada con éxito.' };
    }

    throw { status: 400, message: 'Acción no válida. Use "aprobar" o "rechazar".' };
};

// ==========================================
// 3. CANCELAR SOLICITUD (PUT - Solo el solicitante)
// ==========================================
const cancelarSolicitud = async (actividadId, usuarioId) => {
    // 1. Verificar que la solicitud existe
    const estadoQuery = await db.query(
        `SELECT r.estado_reserva, r.usuario_id
         FROM reservas_estudiantes r
         WHERE r.actividad_id = $1`,
        [actividadId]
    );

    if (estadoQuery.rows.length === 0) {
        throw { status: 404, message: 'La solicitud no existe.' };
    }

    const reserva = estadoQuery.rows[0];

    // 2. Solo el dueño puede cancelar su propia solicitud
    if (reserva.usuario_id !== usuarioId) {
        throw { status: 403, message: 'No tienes permiso para cancelar esta solicitud.' };
    }

    // 3. Solo se puede cancelar si está pendiente
    if (reserva.estado_reserva !== 'pendiente') {
        throw { status: 400, message: `No se puede cancelar una solicitud con estado: ${reserva.estado_reserva}` };
    }

    // 4. Actualizar estado a cancelada
    await db.query(
        `UPDATE reservas_estudiantes 
         SET estado_reserva = 'cancelada'
         WHERE actividad_id = $1`,
        [actividadId]
    );

    return { message: 'Solicitud cancelada correctamente.' };
};

// ==========================================
// 3. ENTREGAR EQUIPOS (Descuenta inventario)
// ==========================================
const registrarEntregaEquipos = async (actividadId, usuarioId) => {
    // Asegurarnos de que el ENUM tiene 'entregado' ANTES de iniciar la transacción.
    try {
        await db.query(`ALTER TYPE estado_reserva_enum ADD VALUE IF NOT EXISTS 'entregado'`);
    } catch (e) { /* ignoramos */ }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar estado actual (debe ser aprobada)
        const resQuery = await client.query(
            `SELECT estado_reserva FROM reservas_estudiantes WHERE actividad_id = $1 FOR UPDATE`,
            [actividadId]
        );

        if (resQuery.rows.length === 0) {
            throw new Error("Reserva no encontrada");
        }
        if (resQuery.rows[0].estado_reserva !== 'aprobada') {
            throw new Error(`No se puede entregar equipos porque la reserva está en estado: ${resQuery.rows[0].estado_reserva}`);
        }

        // 2. Cambiar estado a 'entregado'
        await client.query(
            `UPDATE reservas_estudiantes SET estado_reserva = 'entregado' WHERE actividad_id = $1`,
            [actividadId]
        );

        // 3. Descontar Inventario Físico
        const resItems = await client.query(
            `SELECT item_id, cantidad_solicitada FROM reserva_items WHERE actividad_id = $1`,
            [actividadId]
        );

        for (const fila of resItems.rows) {
            // Restar inventario
            const rest = await client.query(
                `UPDATE item_inventario SET cantidad_actual = cantidad_actual - $1 WHERE id = $2 AND cantidad_actual >= $1 RETURNING id`,
                [fila.cantidad_solicitada, fila.item_id]
            );
            if (rest.rowCount === 0) {
                throw new Error(`Stock insuficiente para el ítem con ID ${fila.item_id} al intentar entregar.`);
            }

            // Registrar movimiento de egreso
            await client.query(
                `INSERT INTO movimiento_inventario (item_id, usuario_id, tipo_movimiento, cantidad, observaciones) VALUES ($1, $2, 'egreso', $3, 'Entrega de equipos por reserva de actividad ID ' || $4)`,
                [fila.item_id, usuarioId, fila.cantidad_solicitada, actividadId]
            );
        }

        await client.query('COMMIT');
        return { exito: true, mensaje: 'Equipos entregados y descontados del inventario exitosamente.' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ==========================================
// 4. DEVOLVER EQUIPOS (Suma inventario y reporta daños)
// ==========================================
const registrarDevolucionEquipos = async (actividadId, reporteDano = null, resolutorId) => {
    // Asegurarnos de que el ENUM tiene 'devuelto' ANTES de iniciar la transacción
    try {
        await db.query(`ALTER TYPE estado_reserva_enum ADD VALUE IF NOT EXISTS 'devuelto'`);
    } catch (e) { /* ignoramos */ }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar estado actual (debe ser entregado)
        const resQuery = await client.query(
            `SELECT estado_reserva FROM reservas_estudiantes WHERE actividad_id = $1 FOR UPDATE`,
            [actividadId]
        );

        if (resQuery.rows.length === 0) {
            throw new Error("Reserva no encontrada");
        }
        if (resQuery.rows[0].estado_reserva !== 'entregado') {
            throw new Error(`No se puede devolver equipos porque la reserva está en estado: ${resQuery.rows[0].estado_reserva}`);
        }

        // 2. Cambiar estado a 'devuelto' (o 'completada' si prefiere)
        // La cambiaremos a completada que ya existe en el ENUM, pero representará "devuelto"
        await client.query(
            `UPDATE reservas_estudiantes SET estado_reserva = 'completada', resuelto_por = $1, fecha_resolucion = CURRENT_TIMESTAMP WHERE actividad_id = $2`,
            [resolutorId, actividadId]
        );

        // 3. Sumar Inventario Físico
        const resItems = await client.query(
            `SELECT item_id, cantidad_solicitada FROM reserva_items WHERE actividad_id = $1`,
            [actividadId]
        );

        for (const fila of resItems.rows) {
            // Aumentar inventario (sin importar si está dañado, vuelve al inventario y la alerta lo marcará)
            // O podríamos restarlo si se dio de baja, pero la alerta de daño solo lo reporta.
            await client.query(
                `UPDATE item_inventario SET cantidad_actual = cantidad_actual + $1 WHERE id = $2`,
                [fila.cantidad_solicitada, fila.item_id]
            );

            // Registrar movimiento de ingreso
            await client.query(
                `INSERT INTO movimiento_inventario (item_id, usuario_id, tipo_movimiento, cantidad, observaciones) VALUES ($1, $2, 'ingreso', $3, 'Devolución de equipos por reserva de actividad ID ' || $4)`,
                [fila.item_id, resolutorId, fila.cantidad_solicitada, actividadId]
            );
        }

        // 4. Procesar reporte de daño si existe
        if (reporteDano) {
            const { item_id, tipo_problema, descripcion, cantidad_afectada } = reporteDano;

            // Insertar la alerta vinculada a la actividad
            await client.query(
                `INSERT INTO alertas_inventario 
                (item_id, actividad_id, usuario_reporta_id, tipo_problema, descripcion, cantidad_afectada, estado) 
                VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')`,
                [item_id, actividadId, resolutorId, tipo_problema, descripcion, cantidad_afectada]
            );
        }

        await client.query('COMMIT');
        return { exito: true, mensaje: 'Equipos devueltos al inventario exitosamente.' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    programarActividad,
    actualizarActividad,
    eliminarActividad,
    obtenerDisponibilidad,
    obtenerActividadesExpandidas,
    obtenerTodasSolicitudes,
    resolverSolicitud,
    cancelarSolicitud,
    registrarEntregaEquipos,
    registrarDevolucionEquipos
};