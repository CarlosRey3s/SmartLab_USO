const express = require('express');
const router = express.Router();
const { getUsoLaboratorios, getReporteReservas } = require('../controllers/reportes.controller');
const { verificarRol } = require('../middlewares/verificarRol');

const soloAdminOCoordinador = verificarRol(['administrador', 'coordinador', 'supervisor']);

// Obtener uso de laboratorios en un rango de fechas
router.get('/uso-laboratorios', soloAdminOCoordinador, getUsoLaboratorios);

// Obtener reporte de reservas filtrado por rol y fechas
router.get('/reservas', soloAdminOCoordinador, getReporteReservas);

module.exports = router;
