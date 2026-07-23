const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verificarRol } = require('../middlewares/verificarRol');

// Gestión administrativa de usuarios (solo administrador)
const soloAdmin = verificarRol(['administrador']);
const soloAdminOSupervisor = verificarRol(['administrador', 'supervisor']);

// Definir la ruta GET /api/usuarios
router.get('/', soloAdminOSupervisor, usuarioController.getUsuarios);

// Definir la ruta POST /api/usuarios (Crear usuario)
router.post('/', soloAdmin, usuarioController.crearUsuario);

// Definir la ruta PUT /api/usuarios/:id (Actualizar usuario)
router.put('/:id', soloAdmin, usuarioController.actualizarUsuario);

// Definir la ruta DELETE /api/usuarios/:id (Eliminar usuario)
router.delete('/:id', soloAdmin, usuarioController.eliminarUsuario);

module.exports = router;
