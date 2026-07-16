const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventario.controller');

// Definir la ruta GET /api/inventario
router.get('/', inventarioController.getInventario);

// Definir la ruta POST /api/inventario
router.post('/', inventarioController.crearItem);

// Definir la ruta PUT /api/inventario/:id
router.put('/:id', inventarioController.updateItem);

// Definir la ruta DELETE /api/inventario/:id
router.delete('/:id', inventarioController.deleteItem);

// Rutas para movimientos de inventario
router.get('/disponibilidad', inventarioController.getInventarioDisponible);
router.get('/movimientos/:itemId', inventarioController.getMovimientosPorItem);
router.post('/movimientos', inventarioController.crearMovimiento);

module.exports = router;
