const express = require('express');
const router = express.Router();

// 1. Importamos el controlador
const actividadesController = require('../controllers/actividades.controller.js');

// 2. Importamos el middleware 
const { validarActividades } = require('../middlewares/validarActividades.js');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

/**
 * @route POST /api/actividades
 * @desc Crear una nueva actividad (clase, Mantenimiento o reserva)
 * @access Private (Requiere autenticacion)
 */

// 4. NUESTRA RUTA GET UNIFICADA (Para leer el calendario)
router.get('/', verificarToken, actividadesController.obtenerActividades);

//Rutas específicas PRIMERO
router.get('/solicitudes/todas', verificarToken, actividadesController.obtenerTodas);

// Motor de decisión: Aprobar o Rechazar (Solo administrador y coordinador)
router.put('/solicitudes/:id/resolver', verificarToken, verificarRol(['administrador', 'coordinador']), actividadesController.resolverSolicitud);

// Entregar Equipos (pasa a entregado y descuenta inventario)
router.put('/solicitudes/:id/entregar', verificarToken, actividadesController.entregarEquipos);

// Devolver Equipos (pasa a devuelto, suma inventario y reporta daños)
router.put('/solicitudes/:id/devolver', verificarToken, actividadesController.devolverEquipos);

router.get('/disponibilidad', verificarToken, actividadesController.consultarDisponibilidad);
router.put('/solicitudes/:id/cancelar', verificarToken, actividadesController.cancelarReserva);
// Reprogramar solicitud incompleta (Solo administrador y coordinador)
router.put('/solicitudes/:id/reprogramar', verificarToken, verificarRol(['administrador', 'coordinador']), actividadesController.reprogramarSolicitud);
// Marcar Inasistencia de Estudiante Fantasma (Solo administrador y coordinador)
router.put('/solicitudes/:id/ausente', verificarToken, verificarRol(['administrador', 'coordinador']), actividadesController.marcarAusente);
// Marcar Asistencia a espacios completos (Solo administrador y coordinador)
router.put('/solicitudes/:id/asistencia', verificarToken, verificarRol(['administrador', 'coordinador']), actividadesController.marcarAsistencia);

router.post('/', verificarToken, validarActividades, actividadesController.crearActividad);
router.put('/:id', verificarToken, validarActividades, actividadesController.actualizarActividad);
router.delete('/:id', verificarToken, actividadesController.eliminarActividad);

module.exports = router;