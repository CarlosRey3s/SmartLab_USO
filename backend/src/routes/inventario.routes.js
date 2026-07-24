const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventario.controller');
const upload = require('../middlewares/upload.middleware');
const { verificarRol } = require('../middlewares/verificarRol');

const soloAdminOCoordinador = verificarRol(['administrador', 'coordinador']);

// Definir la ruta GET /api/inventario
router.get('/', inventarioController.getInventario);

// Definir la ruta POST /api/inventario
router.post('/', soloAdminOCoordinador, upload.single('imagen'), inventarioController.crearItem);

// Definir la ruta PUT /api/inventario/:id
router.put('/:id', soloAdminOCoordinador, upload.single('imagen'), inventarioController.updateItem);

// Definir la ruta DELETE /api/inventario/:id
router.delete('/:id', soloAdminOCoordinador, inventarioController.deleteItem);

// Rutas para movimientos de inventario
router.get('/disponibilidad', inventarioController.getInventarioDisponible);
router.get('/movimientos/:itemId', inventarioController.getMovimientosPorItem);
router.post('/movimientos', soloAdminOCoordinador, inventarioController.crearMovimiento);

module.exports = router;
