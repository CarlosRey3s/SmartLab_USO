const express = require('express');
const router = express.Router();

// 1. Importamos el controlador
const actividadesController = require('../controllers/actividades.controller.js');

// 2. Importamos el middleware 
const { validarActividades } = require('../middlewares/validarActividades.js');
const { verificarToken } = require('../middlewares/auth.middleware');
// 3. Middleware dummy de prueba
const dummyAuth = (req, res, next) => {
    req.usuario = { id: 1 }; // Simulamos que el Admin con ID 1 está logueado
    next();
};

/**
 * @route POST /api/actividades
 * @desc Crear una nueva actividad (clase, Mantenimiento o reserva)
 * @access Private (Requiere autenticacion)
 */
// 4. Definimos la ruta limpia. Si sigue marcando TypeError, el problema está adentro de validarActividades.js
router.post('/', dummyAuth, validarActividades, actividadesController.crearActividad);
// 4. NUESTRA RUTA GET UNIFICADA (Para leer el calendario)
router.get('/', actividadesController.obtenerActividades);
router.put('/:id', dummyAuth, validarActividades, actividadesController.actualizarActividad);
router.delete('/:id', dummyAuth, actividadesController.eliminarActividad);
router.get('/disponibilidad', dummyAuth, actividadesController.consultarDisponibilidad);

router.post('/', verificarToken, validarActividades, actividadesController.crearActividad);
module.exports = router;