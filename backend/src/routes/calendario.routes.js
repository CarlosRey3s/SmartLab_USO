const express = require('express');
const router = express.Router();
const calendarioController = require('../controllers/calendario.controller');

// Definir la ruta GET /api/calendario
router.get('/', calendarioController.getActividades);

// Definir la ruta POST /api/calendario
router.post('/', calendarioController.crearActividad);

module.exports = router;
