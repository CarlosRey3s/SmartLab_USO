const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const axios = require('axios');
const usuarioService = require('./usuario.service');

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

const getMicrosoftProfile = async (accessToken) => {
  try {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    throw new Error('Token de Microsoft inválido o expirado');
  }
};

const loginMicrosoft = async (accessToken) => {
  const profile = await getMicrosoftProfile(accessToken);
  const correo = profile.mail || profile.userPrincipalName;

  if (!correo) {
    throw new Error('No se pudo obtener el correo del perfil de Microsoft');
  }

  const query = 'SELECT * FROM usuarios WHERE correo = $1';
  const result = await pool.query(query, [correo]);

  if (result.rows.length === 0) {
    // Usuario no existe, requiere completar perfil
    return { status: 'incomplete_profile', message: 'Usuario no encontrado', msProfile: profile };
  }

  const usuario = result.rows[0];
  if (usuario.estado !== 'activo') {
    throw new Error('La cuenta del usuario está inactiva');
  }

  const { password_hash, ...userData } = usuario;
  return { status: 'success', user: userData };
};

const registerMicrosoft = async (accessToken, expediente, rol) => {
  const profile = await getMicrosoftProfile(accessToken);
  const correo = profile.mail || profile.userPrincipalName;
  
  if (!correo) {
    throw new Error('No se pudo obtener el correo del perfil de Microsoft');
  }

  const nombre = profile.givenName || (profile.displayName ? profile.displayName.split(' ')[0] : 'Usuario');
  const apellido = profile.surname || (profile.displayName ? profile.displayName.split(' ').slice(1).join(' ') : 'Microsoft');
  
  // Regla de Negocio: Correos estrictamente administradores
  const adminEmails = [
    'pg21i04001@usonsonate.edu.sv',
    'rc21i04001@usonsonate.edu.sv',
    'dm18i04001@usonsonate.edu.sv'
  ];

  const correoLower = correo.toLowerCase();
  
  if (adminEmails.includes(correoLower)) {
    rol = 'administrador';
  } else if (rol === 'administrador') {
    throw new Error('No tienes privilegios para registrarte como administrador con este correo.');
  }

  // Generamos una contraseña aleatoria de 32 caracteres para cumplir con la BD
  const randomPassword = require('crypto').randomBytes(16).toString('hex');

  const userData = {
    nombre,
    apellido,
    expediente,
    correo,
    password: randomPassword,
    rol
  };

  const nuevoUsuario = await usuarioService.crearUsuario(userData);
  return nuevoUsuario;
};

module.exports = {
  login,
  loginMicrosoft,
  registerMicrosoft
};
