const { pool } = require('../config/db');

// Aquí irán las consultas reales a la base de datos
// Por ahora usamos mocks o consultas básicas para probar

const bcrypt = require('bcrypt');

const obtenerTodosLosUsuarios = async () => {
  const query = `
    SELECT id, nombre, apellido, expediente, correo, rol, estado, fecha_creacion 
    FROM usuarios 
    ORDER BY fecha_creacion DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

const crearUsuario = async (userData) => {
  const { nombre, apellido, expediente, correo, password, rol } = userData;
  
  // Encriptar la contraseña (10 rondas de salt)
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  
  const query = `
    INSERT INTO usuarios (nombre, apellido, expediente, correo, password_hash, rol)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, nombre, apellido, expediente, correo, rol, estado, fecha_creacion;
  `;
  
  const values = [nombre, apellido, expediente, correo, password_hash, rol];
  
  const result = await pool.query(query, values);
  return result.rows[0]; // Retorna el usuario recién creado (sin el hash)
};

const actualizarUsuario = async (id, userData) => {
  const { nombre, apellido, expediente, correo, password, rol, estado } = userData;
  
  let query;
  let values;

  // Si se envió una nueva contraseña, la encriptamos y la incluimos
  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    query = `
      UPDATE usuarios 
      SET nombre = $1, apellido = $2, expediente = $3, correo = $4, password_hash = $5, rol = $6, estado = $7
      WHERE id = $8
      RETURNING id, nombre, apellido, expediente, correo, rol, estado, fecha_creacion;
    `;
    values = [nombre, apellido, expediente, correo, password_hash, rol, estado || 'activo', id];
  } else {
    // Si no hay contraseña nueva, actualizamos solo el resto
    query = `
      UPDATE usuarios 
      SET nombre = $1, apellido = $2, expediente = $3, correo = $4, rol = $5, estado = $6
      WHERE id = $7
      RETURNING id, nombre, apellido, expediente, correo, rol, estado, fecha_creacion;
    `;
    values = [nombre, apellido, expediente, correo, rol, estado || 'activo', id];
  }
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

const eliminarUsuario = async (id) => {
  const query = 'DELETE FROM usuarios WHERE id = $1 RETURNING id;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  obtenerTodosLosUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
};
