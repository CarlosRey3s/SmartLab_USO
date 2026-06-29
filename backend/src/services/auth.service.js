const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

const login = async (correo, password) => {
  // --- USUARIO DE PRUEBA TEMPORAL ---
  if (correo === 'admin@prueba.com' && password === 'admin123') {
    return {
      id: 9999,
      nombre: 'Admin',
      apellido: 'Prueba',
      correo: 'admin@prueba.com',
      rol: 'administrador',
      estado: 'activo'
    };
  }
  // ----------------------------------

  // 1. Buscar usuario por correo
  const query = 'SELECT * FROM usuarios WHERE correo = $1';
  const result = await pool.query(query, [correo]);

  if (result.rows.length === 0) {
    throw new Error('Credenciales inválidas');
  }

  const usuario = result.rows[0];

  // 2. Verificar si está activo
  if (usuario.estado !== 'activo') {
    throw new Error('La cuenta del usuario está inactiva');
  }

  // 3. Comparar contraseñas
  const isMatch = await bcrypt.compare(password, usuario.password_hash);
  if (!isMatch) {
    throw new Error('Credenciales inválidas');
  }

  // 4. Retornar datos del usuario (sin el hash)
  const { password_hash, ...userData } = usuario;
  return userData;
};

module.exports = {
  login
};
