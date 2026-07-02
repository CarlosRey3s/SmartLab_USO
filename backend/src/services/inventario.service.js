const { pool } = require('../config/db');

// Obtener todos los items del inventario
const obtenerTodoElInventario = async () => {
  const query = `
    SELECT 
      id, laboratorio_id, nombre, codigo_interno, numero_cas, categoria, 
      ubicacion_fisica, unidad_medida, tipo_control, cantidad_actual, 
      stock_minimo, imagen_url
    FROM item_inventario 
    ORDER BY nombre ASC
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
    return nuevoMovimiento;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  obtenerTodoElInventario,
  crearItemInventario,
  obtenerMovimientosPorItem,
  crearMovimientoInventario
};
