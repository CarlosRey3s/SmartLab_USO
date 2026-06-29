const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventario.controller');

// Definir la ruta GET /api/inventario
router.get('/', inventarioController.getInventario);

// Definir la ruta POST /api/inventario
router.post('/', inventarioController.crearItem);

module.exports = router;
