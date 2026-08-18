const express = require('express');
const router = express.Router();
const sugerenciaController = require('../controllers/sugerencia.controller');
const { verificarRol } = require('../middlewares/verificarRol');
const { verificarToken } = require('../middlewares/auth.middleware');

const soloAdminOCoordinador = verificarRol(['administrador', 'coordinador']);

// Obtener todas las sugerencias (libre, pero filtrado internamente por controlador)
router.get('/', verificarToken, sugerenciaController.getSugerencias);

// Crear una nueva sugerencia (libre para todos los roles)
router.post('/', verificarToken, sugerenciaController.crearSugerencia);

// Actualizar una sugerencia (estado o respuesta) - Solo gestión
router.put('/:id', verificarToken, soloAdminOCoordinador, sugerenciaController.actualizarSugerencia);

// Eliminar una sugerencia - Solo gestión
router.delete('/:id', verificarToken, soloAdminOCoordinador, sugerenciaController.eliminarSugerencia);

module.exports = router;
