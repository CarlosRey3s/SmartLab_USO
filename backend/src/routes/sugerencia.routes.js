const express = require('express');
const router = express.Router();
const sugerenciaController = require('../controllers/sugerencia.controller');

// Obtener todas las sugerencias
router.get('/', sugerenciaController.getSugerencias);

// Crear una nueva sugerencia
router.post('/', sugerenciaController.crearSugerencia);

// Actualizar una sugerencia (estado o respuesta)
router.put('/:id', sugerenciaController.actualizarSugerencia);

// Eliminar una sugerencia
router.delete('/:id', sugerenciaController.eliminarSugerencia);

module.exports = router;
