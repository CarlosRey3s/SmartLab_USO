const usuarioService = require('../services/usuario.service');

const getUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioService.obtenerTodosLosUsuarios();
    res.json({
      status: 'success',
      data: usuarios
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

const crearUsuario = async (req, res) => {
  try {
    // req.body contiene los datos enviados desde el frontend/postman
    const nuevoUsuario = await usuarioService.crearUsuario(req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Usuario creado exitosamente',
      data: nuevoUsuario
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    // Verificar si es un error de duplicado (ej. correo o expediente ya existe)
    if (error.code === '23505') {
      return res.status(400).json({ status: 'error', message: 'El correo o expediente ya está registrado' });
    }
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al crear usuario' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    const usuarioActualizado = await usuarioService.actualizarUsuario(id, req.body);
    
    if (!usuarioActualizado) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }
    
    res.json({
      status: 'success',
      message: 'Usuario actualizado exitosamente',
      data: usuarioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    if (error.code === '23505') {
      return res.status(400).json({ status: 'error', message: 'El correo o expediente ya está registrado' });
    }
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al actualizar usuario' });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    const usuarioEliminado = await usuarioService.eliminarUsuario(id);
    
    if (!usuarioEliminado) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }
    
    res.json({
      status: 'success',
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al eliminar usuario' });
  }
};

module.exports = {
  getUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
};
