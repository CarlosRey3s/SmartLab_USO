const express = require('express');
const router = express.Router();
const alertasController = require('../controllers/alertas.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const soloAdmins = verificarRol(['administrador', 'coordinador']);

// Obtener todas las alertas
router.get('/', verificarToken, soloAdmins, alertasController.getAlertas);

// Crear nueva alerta manual
router.post('/', verificarToken, soloAdmins, alertasController.createAlerta);

// Actualizar el estado de la alerta
router.put('/:id/estado', verificarToken, soloAdmins, alertasController.updateAlertaStatus);

module.exports = router;
