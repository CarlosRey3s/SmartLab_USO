const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

// Definir la ruta GET /api/usuarios
router.get('/', usuarioController.getUsuarios);

// Definir la ruta POST /api/usuarios (Crear usuario)
router.post('/', usuarioController.crearUsuario);

// Definir la ruta PUT /api/usuarios/:id (Actualizar usuario)
router.put('/:id', usuarioController.actualizarUsuario);

// Definir la ruta DELETE /api/usuarios/:id (Eliminar usuario)
router.delete('/:id', usuarioController.eliminarUsuario);

module.exports = router;
