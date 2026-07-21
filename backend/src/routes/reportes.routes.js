const express = require('express');
const router = express.Router();
const { getUsoLaboratorios } = require('../controllers/reportes.controller');

// Obtener uso de laboratorios en un rango de fechas
router.get('/uso-laboratorios', getUsoLaboratorios);

module.exports = router;
