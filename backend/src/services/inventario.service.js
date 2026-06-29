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

module.exports = {
  obtenerTodoElInventario,
  crearItemInventario
};
