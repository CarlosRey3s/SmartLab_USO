const express = require('express');
const router = express.Router();

// 1. Importamos el controlador
const actividadesController = require('../controllers/actividades.controller.js');

// 2. Importamos el middleware 
const { validarActividades } = require('../middlewares/validarActividades.js');
const { verificarToken } = require('../middlewares/auth.middleware');

// 3. Middleware dummy de prueba
/*const dummyAuth = (req, res, next) => {
    req.usuario = { id: 1 }; // Simulamos que el Admin con ID 1 está logueado
    next();
};
*/
/**
 * @route POST /api/actividades
 * @desc Crear una nueva actividad (clase, Mantenimiento o reserva)
 * @access Private (Requiere autenticacion)
 */

// 4. NUESTRA RUTA GET UNIFICADA (Para leer el calendario)
router.get('/', actividadesController.obtenerActividades);


// ¡OJO!: Asegúrate de poner la ruta de "pendientes" ANTES que cualquier ruta que use "/:id" 
// para que Express no confunda la palabra "pendientes" con un parámetro de ID.

// Obtener bandeja de entrada (Protegido: Solo admins y coordinadores deberían verlo idealmente)
router.get('/solicitudes/pendientes', verificarToken, actividadesController.obtenerPendientes);

// Obtener TODAS las solicitudes (pendientes, aprobadas, rechazadas)
router.get('/solicitudes/todas', verificarToken, actividadesController.obtenerTodas);

// Motor de decisión: Aprobar o Rechazar
router.put('/solicitudes/:id/resolver', verificarToken, actividadesController.resolverSolicitud);

// Entregar Equipos (pasa a entregado y descuenta inventario)
router.put('/solicitudes/:id/entregar', verificarToken, actividadesController.entregarEquipos);

// Devolver Equipos (pasa a devuelto, suma inventario y reporta daños)
router.put('/solicitudes/:id/devolver', verificarToken, actividadesController.devolverEquipos);


// RUTAS PROTEGIDAS: Ahora usan verificarToken para leer el token de Postman/Frontend
router.post('/', verificarToken, validarActividades, actividadesController.crearActividad);
router.put('/:id', verificarToken, validarActividades, actividadesController.actualizarActividad);
router.delete('/:id', verificarToken, actividadesController.eliminarActividad);
router.get('/disponibilidad', verificarToken, actividadesController.consultarDisponibilidad);


module.exports = router;