const { pool } = require('../config/db');
const { verificarAlertasAutomaticas } = require('./alertas.service');

// Obtener todos los items del inventario
const obtenerTodoElInventario = async () => {
  const query = `
    SELECT 
      i.id, i.laboratorio_id, l.nombre AS laboratorio_nombre, i.nombre, i.codigo_interno, 
      i.numero_cas, i.categoria, i.ubicacion_fisica, i.unidad_medida, i.tipo_control, 
      i.cantidad_actual, i.stock_minimo, i.imagen_url
    FROM item_inventario i
    LEFT JOIN laboratorios l ON i.laboratorio_id = l.id
    ORDER BY i.nombre ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

// Crear un nuevo item en el inventario
const crearItemInventario = async (itemData) => {
  const {
    laboratorio_id, nombre, codigo_interno, numero_cas, categoria,
    ubicacion_fisica, unidad_medida, tipo_control, cantidad_actual,
    stock_minimo, imagen_url
  } = itemData;

  const query = `
    INSERT INTO item_inventario (
      laboratorio_id, nombre, codigo_interno, numero_cas, categoria, 
      ubicacion_fisica, unidad_medida, tipo_control, cantidad_actual, 
      stock_minimo, imagen_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  const values = [
    laboratorio_id, nombre, codigo_interno, numero_cas, categoria,
    ubicacion_fisica, unidad_medida, tipo_control, cantidad_actual || 0,
    stock_minimo || 0, imagen_url
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Obtener los movimientos de un item específico
const obtenerMovimientosPorItem = async (itemId) => {
  const query = `
    SELECT 
      m.id, m.item_id, m.usuario_id, m.tipo_movimiento, m.cantidad, 
      m.fecha_movimiento, m.observaciones,
      u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
    FROM movimiento_inventario m
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.item_id = $1
    ORDER BY m.fecha_movimiento DESC
  `;

  const result = await pool.query(query, [itemId]);
  return result.rows;
};

// Registrar un movimiento y actualizar el stock
const crearMovimientoInventario = async (movimientoData) => {
  const { item_id, usuario_id, tipo_movimiento, cantidad, observaciones } = movimientoData;

  // Usar transacción para asegurar que el movimiento y la actualización del stock ocurran juntos
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Registrar el movimiento
    const queryMovimiento = `
      INSERT INTO movimiento_inventario (item_id, usuario_id, tipo_movimiento, cantidad, observaciones)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const resultMovimiento = await client.query(queryMovimiento, [
      item_id, usuario_id, tipo_movimiento, cantidad, observaciones
    ]);

    const nuevoMovimiento = resultMovimiento.rows[0];

    // 2. Actualizar la cantidad en el item de inventario dependiendo del tipo
    let queryActualizarStock = '';

    if (tipo_movimiento === 'ingreso' || tipo_movimiento === 'ajuste') {
      queryActualizarStock = `
        UPDATE item_inventario 
        SET cantidad_actual = cantidad_actual + $1 
        WHERE id = $2
      `;
    } else if (tipo_movimiento === 'egreso') {
      queryActualizarStock = `
        UPDATE item_inventario 
        SET cantidad_actual = cantidad_actual - $1 
        WHERE id = $2
      `;
    }

    await client.query(queryActualizarStock, [cantidad, item_id]);

    await client.query('COMMIT');

    //  LÓGICA DE ALERTAS AUTOMÁTICAS:
    // Hacemos await para asegurar que si se genera alerta, esté lista antes de que el frontend recargue
    try {
      await verificarAlertasAutomaticas(item_id);
    } catch (err) {
      console.error("Error disparando alerta de stock:", err);
    }

    return nuevoMovimiento;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Actualizar un item en el inventario
const actualizarItemInventario = async (id, itemData) => {
  const {
    laboratorio_id, nombre, codigo_interno, numero_cas, categoria,
    ubicacion_fisica, unidad_medida, tipo_control, cantidad_actual,
    stock_minimo, imagen_url
  } = itemData;

  const query = `
    UPDATE item_inventario 
    SET laboratorio_id = $1, nombre = $2, codigo_interno = $3, numero_cas = $4, 
        categoria = $5, ubicacion_fisica = $6, unidad_medida = $7, tipo_control = $8, 
        cantidad_actual = $9, stock_minimo = $10, imagen_url = $11
    WHERE id = $12
    RETURNING *;
  `;

  const values = [
    laboratorio_id, nombre, codigo_interno, numero_cas, categoria,
    ubicacion_fisica, unidad_medida, tipo_control, cantidad_actual || 0,
    stock_minimo || 0, imagen_url, id
  ];

  const result = await pool.query(query, values);

  // LÓGICA DE ALERTAS AUTOMÁTICAS:
  try {
    await verificarAlertasAutomaticas(id);
  } catch (err) {
    console.error("Error disparando alerta de stock en edición:", err);
  }

  return result.rows[0];
};

// Eliminar un item en el inventario
const eliminarItemInventario = async (id) => {
  const query = 'DELETE FROM item_inventario WHERE id = $1 RETURNING id, imagen_url;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**---------FUNCIONES PARA EL CALENDARIO ------------*/

const obtenerInventarioConStockDisponible = async (laboratorioId, fecha, horaInicio, horaFin, excludeActividadId = null) => {  //convertimos a formato datetime para hacer el cruce de traslapes
  const inicioDatetime = new Date(`${fecha}T${horaInicio}`);
  const finDatetime = new Date(`${fecha}T${horaFin}`);

  // Base de los parametros de la consulta
  const params = [laboratorioId, finDatetime, inicioDatetime];

  //Construimos la subconsulta dinamica.
  //Buscamos todas las reservas que se solapen y sumamos la cantidad solicitada

  let subqueryWhere = `
    a.laboratorio_id = $1
    AND a.fecha_hora_inicio < $2
    AND a.fecha_hora_fin > $3
    AND a.tipo NOT IN ('mantenimiento')
  `

  if (excludeActividadId) {
    subqueryWhere += `
    AND a.id != $4`;
    params.push(excludeActividadId);
  }

  // Conaulta principal con LEFT JOIN y calculo matematico directo en SQL
  const query = `
      SELECT 
          i.id, i.nombre, i.codigo_interno, i.categoria, i.unidad_medida, 
          i.tipo_control, i.cantidad_actual, i.stock_minimo, i.imagen_url,
          COALESCE(r.cantidad_reservada, 0)::INTEGER AS cantidad_reservada,
          GREATEST(i.cantidad_actual - COALESCE(r.cantidad_reservada, 0), 0)::INTEGER AS stock_disponible
      FROM item_inventario i
      LEFT JOIN (
          SELECT 
              ri.item_id,
              SUM(ri.cantidad_solicitada) AS cantidad_reservada
          FROM reserva_items ri
          INNER JOIN actividades a ON ri.actividad_id = a.id
          WHERE ${subqueryWhere}
          GROUP BY ri.item_id
      ) r ON i.id = r.item_id
      WHERE i.laboratorio_id = $1
      ORDER BY i.nombre ASC;
    `;
  const result = await pool.query(query, params);
  return result.rows;
}



module.exports = {
  obtenerTodoElInventario,
  crearItemInventario,
  actualizarItemInventario,
  eliminarItemInventario,
  obtenerMovimientosPorItem,
  crearMovimientoInventario,
  obtenerInventarioConStockDisponible
};
