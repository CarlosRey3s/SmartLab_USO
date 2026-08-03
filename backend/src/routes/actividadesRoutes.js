const express = require('express');
const router = express.Router();

// 1. Importamos el controlador
const actividadesController = require('../controllers/actividades.controller.js');

// 2. Importamos el middleware 
const { validarActividades } = require('../middlewares/validarActividades.js');
const { verificarToken } = require('../middlewares/auth.middleware');

/**
 * @route POST /api/actividades
 * @desc Crear una nueva actividad (clase, Mantenimiento o reserva)
 * @access Private (Requiere autenticacion)
 */

// 4. NUESTRA RUTA GET UNIFICADA (Para leer el calendario)
router.get('/', verificarToken, actividadesController.obtenerActividades);

//Rutas específicas PRIMERO
router.get('/solicitudes/pendientes', verificarToken, actividadesController.obtenerPendientes);
router.get('/solicitudes/todas', verificarToken, actividadesController.obtenerTodas);
router.get('/disponibilidad', verificarToken, actividadesController.consultarDisponibilidad); // ← AQUÍ
//router.get('/', verificarToken, actividadesController.obtenerTodas);

// RUTAS PROTEGIDAS: Ahora usan verificarToken para leer el token de Postman/Frontend
router.put('/solicitudes/:id/resolver', verificarToken, actividadesController.resolverReserva);
router.post('/', verificarToken, validarActividades, actividadesController.crearActividad);
router.put('/:id', verificarToken, validarActividades, actividadesController.actualizarActividad);
router.delete('/:id', verificarToken, actividadesController.eliminarActividad);

module.exports = router;