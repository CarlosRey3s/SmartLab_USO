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
        SELECT a.id, a.tipo, re.estado_reserva,
               COALESCE(array_agg(res_est.estacion_id) FILTER (WHERE res_est.estacion_id IS NOT NULL), ARRAY[]::INTEGER[]) as estaciones
        FROM actividades a
        LEFT JOIN reserva_estaciones res_est ON a.id = res_est.actividad_id
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1
          AND a.fecha_hora_inicio < $2 
          AND a.fecha_hora_fin > $3
          -- Solo evaluamos conflicto si es Clase, Mantenimiento o una Reserva 'aprobada'
          AND (a.tipo IN ('clase', 'mantenimiento') OR re.estado_reserva = 'aprobada')
    `;

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
    const inicioDatetime = new Date(`${fecha}T${desde}`);
    const finDatetime = new Date(`${fecha}T${hasta}`);

    // Procesas dinamicamente el objeto JSON de recurrencia
    const reglaRecurrenciaPlana = formatearRecurrencia(recurrencia);

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // [VALIDACIÓN CRÍTICA]: Ejecutar el árbol lógico de choques de horarios e infraestructura
        await verificarChoqueHorario(client, laboratorio, inicioDatetime, finDatetime, tipo, datosModal);

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
            const estadoInicial = (rolUsuario === 'administrador') ? 'aprobada' : 'pendiente';

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

    // CORRECCIÓN: Renombrado a Datetime por consistencia
    const inicioDatetime = new Date(`${fecha}T${desde}`);
    const finDatetime = new Date(`${fecha}T${hasta}`);

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

const obtenerDisponibilidad = async (laboratorioId, fechaInicio, fechaFin) => {
    // =========================================================================
    // 1. Verificar si hay un evento que bloquee TODO el laboratorio 
    // (Ej. Clases, Mantenimientos o reservas del espacio completo)
    // =========================================================================
    const queryBloqueo = `
        SELECT a.tipo 
        FROM actividades a
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1 
          AND a.fecha_hora_inicio < $3 
          AND a.fecha_hora_fin > $2
          AND (a.tipo != 'reserva' OR re.estado_reserva NOT IN ('cancelada', 'rechazada'))
    `;
    const resultBloqueo = await db.query(queryBloqueo, [laboratorioId, fechaInicio, fechaFin]);

    // Si detectamos clases o mantenimientos, el laboratorio entero está bloqueado
    const bloqueoTotal = resultBloqueo.rows.find(row => row.tipo === 'clase' || row.tipo === 'mantenimiento');
    if (bloqueoTotal) {
        return { disponible: false, motivo: `El laboratorio está ocupado por: ${bloqueoTotal.tipo}`, estacionesOcupadas: [], itemsOcupados: {} };
    }

    // =========================================================================
    // 2. Obtener las Estaciones Ocupadas en ese rango de tiempo
    // =========================================================================
    const queryEstaciones = `
        SELECT res_est.estacion_id 
        FROM reserva_estaciones res_est
        JOIN actividades a ON res_est.actividad_id = a.id
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1 
          AND a.fecha_hora_inicio < $3 
          AND a.fecha_hora_fin > $2
          AND (a.tipo != 'reserva' OR re.estado_reserva NOT IN ('cancelada', 'rechazada'))
    `;
    const resultEstaciones = await db.query(queryEstaciones, [laboratorioId, fechaInicio, fechaFin]);
    const estacionesOcupadas = resultEstaciones.rows.map(r => r.estacion_id);

    // =========================================================================
    // 3. Obtener el Inventario Ocupado en ese rango de tiempo
    // =========================================================================
    const queryItems = `
        SELECT ri.item_id, SUM(ri.cantidad_solicitada) as total_ocupado
        FROM reserva_items ri
        JOIN actividades a ON ri.actividad_id = a.id
        LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
        WHERE a.laboratorio_id = $1 
          AND a.fecha_hora_inicio < $3 
          AND a.fecha_hora_fin > $2
          AND (a.tipo != 'reserva' OR re.estado_reserva NOT IN ('cancelada', 'rechazada'))
        GROUP BY ri.item_id
    `;
    const resultItems = await db.query(queryItems, [laboratorioId, fechaInicio, fechaFin]);

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
const obtenerActividadesExpandidas = async (fechaInicioVista, fechaFinVista) => {
    const client = await db.connect();

    try {
        // 1. Convertir los strings de fecha que envía el frontend a objetos Date de JavaScript
        const startVista = new Date(fechaInicioVista);
        const endVista = new Date(fechaFinVista);

        // 2. CONSULTA FUSIONADA: Estructura masiva + Filtro temporal inteligente
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
                a.recurrencia, -- ⚠️ ¡CRUCIAL! La necesitábamos para alimentar el motor de RRule
                
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
                
                -- Subconsulta para empaquetar estaciones en un Array []
                (
                    SELECT COALESCE(array_agg(estacion_id), '{}') 
                    FROM reserva_estaciones 
                    WHERE actividad_id = a.id
                ) AS estaciones,
                 
                -- Subconsulta para empaquetar equipos en un Array de Objetos JSON [{}]
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
            
            -- Uniones estratégicas para traer la metadata correspondiente
            LEFT JOIN laboratorios l ON a.laboratorio_id = l.id
            LEFT JOIN clases_academicas ca ON a.id = ca.actividad_id
            LEFT JOIN usuarios u_docente ON ca.docente_id = u_docente.id
            LEFT JOIN mantenimientos m ON a.id = m.actividad_id
            LEFT JOIN usuarios u_tecnico ON m.tecnico_id = u_tecnico.id
            LEFT JOIN reservas_estudiantes re ON a.id = re.actividad_id
            
            -- ====================================================================
            -- 🚨 FILTROS PRINCIPALES
            -- ====================================================================
            WHERE (
                (a.recurrencia IS NULL AND a.fecha_hora_inicio <= $2 AND a.fecha_hora_fin >= $1)
                OR (a.recurrencia IS NOT NULL AND a.fecha_hora_inicio <= $2)
            )
            AND (a.tipo != 'reserva' OR re.estado_reserva = 'aprobada');
        `;

        const { rows } = await client.query(query, [startVista, endVista]);
        const eventosListosParaReact = [];

        // 3. El Motor de Expansión Procesando Objetos Complejos
        for (const fila of rows) {
            if (!fila.recurrencia) {
                // CASO A: Evento Único (No se repite)
                // Conserva toda la estructura intacta y asignamos id_instancia estándar
                fila.id_instancia = fila.id.toString();
                eventosListosParaReact.push(fila);
            } else {
                // CASO B: Evento Recurrente (Multiplicación por RRule)
                const fechaInicioOriginal = new Date(fila.start);
                const fechaFinOriginal = new Date(fila.end);

                // Calculamos la duración exacta (ej: 2 horas de clase) en milisegundos
                const duracionMilisegundos = fechaFinOriginal.getTime() - fechaInicioOriginal.getTime();

                // Inicializamos la regla matemática con el string de la BD
                try {
                    const regla = rrulestr(fila.recurrencia, {
                        dtstart: fechaInicioOriginal
                    });

                    // Extraemos todas las fechas clonadas que caen en la vista actual (ej: todos los miércoles del mes)
                    const fechasClonadas = regla.between(startVista, endVista, true);

                    for (const fechaClon of fechasClonadas) {
                        // Clonamos el objeto de la fila con TODO su contenido (estaciones, equipos, nombres)
                        const eventoClonado = { ...fila };

                        // Modificamos únicamente las propiedades de tiempo para esta instancia específica
                        eventoClonado.start = fechaClon;
                        eventoClonado.end = new Date(fechaClon.getTime() + duracionMilisegundos);

                        // Llave única compuesta para evitar duplicidad de keys en React Big Calendar
                        eventoClonado.id_instancia = `${fila.id}-${fechaClon.getTime()}`;

                        eventosListosParaReact.push(eventoClonado);
                    }
                } catch (rruleError) {
                    console.warn(`[Advertencia] Error al procesar regla de recurrencia para la actividad ID ${fila.id}. Regla: ${fila.recurrencia}`, rruleError.message);
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
// 1. OBTENER SOLICITUDES PENDIENTES (GET)
// ==========================================
const obtenerSolicitudesPendientes = async () => {
    // Usamos json_agg para agrupar las tablas hijas como arrays dentro del JSON de respuesta
    const query = `
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
            l.nombre AS laboratorio_nombre,
            l.edificio,
            l.aula,
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
        FROM reservas_estudiantes r
        JOIN actividades a ON r.actividad_id = a.id
        JOIN usuarios u ON r.usuario_id = u.id
        JOIN laboratorios l ON a.laboratorio_id = l.id
        WHERE r.estado_reserva = 'pendiente'
        ORDER BY a.fecha_creacion ASC;
    `;
    const { rows } = await db.query(query);
    return rows;
};

// ==========================================
// OBTENER TODAS LAS SOLICITUDES (pendientes, aprobadas, rechazadas)
// ==========================================
const obtenerTodasSolicitudes = async () => {
    const query = `
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
        FROM reservas_estudiantes r
        JOIN actividades a ON r.actividad_id = a.id
        JOIN usuarios u ON r.usuario_id = u.id
        JOIN laboratorios l ON a.laboratorio_id = l.id
        ORDER BY a.fecha_creacion DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
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


module.exports = {
    programarActividad,
    actualizarActividad,
    eliminarActividad,
    obtenerDisponibilidad,
    obtenerActividadesExpandidas,
    //agregado actualmente
    obtenerSolicitudesPendientes,
    obtenerTodasSolicitudes,
    resolverSolicitud

};