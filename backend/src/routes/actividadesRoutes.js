const express = require('express');
const router = express.Router();

// 1. Importamos el controlador
const actividadesController = require('../controllers/actividadesController.js');

// 2. Importamos el middleware (¡Asegúrate de que en el archivo de origen se llame exactamente igual y se exporte en un objeto!)
const { validarActividades } = require('../middlewares/validarActividades.js');

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
router.get('/', actividadesController.obtenerTodasLasActividades);
module.exports = router;