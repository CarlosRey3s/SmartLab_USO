const { pool } = require('../config/db');

// Obtener todas las alertas, con info del item, laboratorio y usuario que reporta
const obtenerTodasLasAlertas = async () => {
  const query = `
    SELECT 
      a.id, 
      a.item_id, i.nombre AS item_nombre, i.codigo_interno AS item_codigo,
      l.id AS laboratorio_id, l.nombre AS laboratorio_nombre,
      a.actividad_id,
      a.usuario_reporta_id, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
      a.tipo_problema, a.descripcion, a.cantidad_afectada,
      a.estado, a.fecha_reporte, a.fecha_resolucion,
      a.resuelto_por_id, r.nombre AS resuelto_nombre, r.apellido AS resuelto_apellido
    FROM alertas_inventario a
    JOIN item_inventario i ON a.item_id = i.id
    JOIN laboratorios l ON i.laboratorio_id = l.id
    LEFT JOIN usuarios u ON a.usuario_reporta_id = u.id
    LEFT JOIN usuarios r ON a.resuelto_por_id = r.id
    ORDER BY a.fecha_reporte DESC
  `;

  const result = await pool.query(query);
  return result.rows;
};

// Crear una nueva alerta (manual o automática)
const crearAlerta = async (alertaData) => {
  const {
    item_id, actividad_id, usuario_reporta_id,
    tipo_problema, descripcion, cantidad_afectada, estado
  } = alertaData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertAlertaQuery = `
      INSERT INTO alertas_inventario (
        item_id, actividad_id, usuario_reporta_id, 
        tipo_problema, descripcion, cantidad_afectada, estado
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'pendiente')::estado_alerta_enum)
      RETURNING *;
    `;
    const valoresAlerta = [
      item_id, actividad_id || null, usuario_reporta_id || null,
      tipo_problema, descripcion, cantidad_afectada || 1, estado || 'pendiente'
    ];

    const resultAlerta = await client.query(insertAlertaQuery, valoresAlerta);
    const nuevaAlerta = resultAlerta.rows[0];

    // 2. Insertar el estado inicial en el historial
    const insertHistorialQuery = `
      INSERT INTO historial_alertas (alerta_id, estado_anterior, estado_nuevo, cambiado_por_id, comentario)
      VALUES ($1, NULL, $2, $3, $4)
    `;
    await client.query(insertHistorialQuery, [
      nuevaAlerta.id,
      nuevaAlerta.estado,
      usuario_reporta_id || null,
      'Creación inicial de la alerta'
    ]);

    await client.query('COMMIT');
    return nuevaAlerta;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Actualizar el estado de una alerta
const actualizarEstadoAlerta = async (id, estado_nuevo, resuelto_por_id = null, comentario = null) => {
  const isResolved = ['resuelto', 'descartado'].includes(estado_nuevo);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener estado anterior
    const getAlertaQuery = 'SELECT estado FROM alertas_inventario WHERE id = $1';
    const resultGet = await client.query(getAlertaQuery, [id]);

    if (resultGet.rows.length === 0) {
      throw new Error('Alerta no encontrada');
    }
    const estado_anterior = resultGet.rows[0].estado;

    if (estado_anterior === estado_nuevo) {
      await client.query('ROLLBACK');
      return { message: 'El estado es el mismo, no hubo cambios' };
    }

    // 2. Actualizar alerta
    const updateAlertaQuery = `
      UPDATE alertas_inventario
      SET 
        estado = $1,
        resuelto_por_id = COALESCE($2, resuelto_por_id),
        fecha_resolucion = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE fecha_resolucion END
      WHERE id = $4
      RETURNING *;
    `;
    const resultUpdate = await client.query(updateAlertaQuery, [estado_nuevo, resuelto_por_id, isResolved, id]);
    const alertaActualizada = resultUpdate.rows[0];

    // 3. Registrar en historial
    const insertHistorialQuery = `
      INSERT INTO historial_alertas (alerta_id, estado_anterior, estado_nuevo, cambiado_por_id, comentario)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(insertHistorialQuery, [
      id,
      estado_anterior,
      estado_nuevo,
      resuelto_por_id || null,
      comentario || 'Actualización de estado'
    ]);

    await client.query('COMMIT');
    return alertaActualizada;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ==========================================
// LÓGICA DE ALERTAS AUTOMÁTICAS (SISTEMA)
// ==========================================

// Verifica el stock de un ítem y decide si crea, actualiza o resuelve una alerta
const verificarAlertasAutomaticas = async (item_id) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener la información del ítem (stock actual y mínimo)
    const itemQuery = 'SELECT cantidad_actual, stock_minimo, nombre FROM item_inventario WHERE id = $1';
    const itemResult = await client.query(itemQuery, [item_id]);

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return; // El ítem no existe
    }

    const { cantidad_actual, stock_minimo, nombre } = itemResult.rows[0];

    // 2. Determinar si existe un problema de stock
    let tipo_problema = null;
    let descripcion = null;

    if (cantidad_actual <= 0) {
      tipo_problema = 'agotado';
      descripcion = `El ítem "${nombre}" se ha quedado sin stock (0 unidades disponibles).`;
    } else if (cantidad_actual <= stock_minimo) {
      tipo_problema = 'bajo_stock';
      descripcion = `El ítem "${nombre}" ha alcanzado el nivel de bajo stock. Solo quedan ${cantidad_actual} unidades.`;
    }

    // 3. Buscar si YA EXISTE una alerta de sistema (agotado o bajo_stock) que NO esté resuelta ni descartada
    const alertaActivaQuery = `
      SELECT id, tipo_problema, estado 
      FROM alertas_inventario 
      WHERE item_id = $1 
        AND tipo_problema IN ('agotado', 'bajo_stock') 
        AND estado NOT IN ('resuelto', 'descartado')
      LIMIT 1
    `;
    const alertaActivaResult = await client.query(alertaActivaQuery, [item_id]);
    const alertaActiva = alertaActivaResult.rows[0];

    // LÓGICA DE DECISIÓN

    if (tipo_problema) {
      // ESTADO CRÍTICO (Agotado o Bajo Stock)

      if (!alertaActiva) {
        // CASO A: Hay problema pero NO hay alerta -> ¡CREARLA!
        const insertAlertaQuery = `
          INSERT INTO alertas_inventario (item_id, tipo_problema, descripcion, estado, usuario_reporta_id) 
          VALUES ($1, $2, $3, 'pendiente', NULL)
          RETURNING *;
        `;
        const resultInsert = await client.query(insertAlertaQuery, [item_id, tipo_problema, descripcion]);
        const nuevaAlerta = resultInsert.rows[0];

        // Guardar historial
        const insertHistorial = `
          INSERT INTO historial_alertas (alerta_id, estado_anterior, estado_nuevo, cambiado_por_id, comentario)
          VALUES ($1, NULL, 'pendiente', NULL, 'Generado automáticamente por el sistema')
        `;
        await client.query(insertHistorial, [nuevaAlerta.id]);

      } else if (alertaActiva.tipo_problema !== tipo_problema) {
        // CASO B: Hay alerta, pero el problema cambió (ej: pasó de 'bajo_stock' a 'agotado')
        const updateAlertaQuery = `
          UPDATE alertas_inventario 
          SET tipo_problema = $1, descripcion = $2 
          WHERE id = $3
        `;
        await client.query(updateAlertaQuery, [tipo_problema, descripcion, alertaActiva.id]);

        // Guardar historial de esta transición
        const insertHistorial = `
          INSERT INTO historial_alertas (alerta_id, estado_anterior, estado_nuevo, cambiado_por_id, comentario)
          VALUES ($1, $2, $3, NULL, $4)
        `;
        await client.query(insertHistorial, [
          alertaActiva.id, alertaActiva.estado, alertaActiva.estado,
          `El sistema actualizó el tipo de problema a: ${tipo_problema}`
        ]);
      }
      // CASO C: Hay alerta y el tipo_problema es el mismo -> No hacer nada.

    } else {
      // ESTADO SALUDABLE (Stock suficiente)

      if (alertaActiva) {
        // CASO D: El stock se recuperó, pero sigue abierta una alerta -> ¡RESOLVERLA AUTOMÁTICAMENTE!
        const resolveQuery = `
          UPDATE alertas_inventario 
          SET estado = 'resuelto', fecha_resolucion = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *;
        `;
        const resultResolve = await client.query(resolveQuery, [alertaActiva.id]);

        // Guardar historial
        const insertHistorial = `
          INSERT INTO historial_alertas (alerta_id, estado_anterior, estado_nuevo, cambiado_por_id, comentario)
          VALUES ($1, $2, 'resuelto', NULL, 'Resuelto automáticamente por el sistema (Stock recuperado)')
        `;
        await client.query(insertHistorial, [alertaActiva.id, alertaActiva.estado]);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al verificar alertas automáticas:', error);
  } finally {
    client.release();
  }
};

module.exports = {
  obtenerTodasLasAlertas,
  crearAlerta,
  actualizarEstadoAlerta,
  verificarAlertasAutomaticas
};
