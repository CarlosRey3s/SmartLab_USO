const express = require('express');
const router = express.Router();
const { getAllLaboratorios, createLaboratorio, updateLaboratorio, deleteLaboratorio, getEstaciones, addEstaciones, deleteEstacion, updateEstacion } = require('../controllers/laboratorio.controller');
const { verificarRol } = require('../middlewares/verificarRol');

// Permitir modificación solo a administradores y coordinadores
const soloAdminOCoordinador = verificarRol(['administrador', 'coordinador']);

// RUTAS CRUD DE LABORATORIOS
// /api/laboratorios

// Obtener todos los laboratorios (GET libre para todos)
router.get('/', getAllLaboratorios);

// Crear un nuevo laboratorio
router.post('/', soloAdminOCoordinador, createLaboratorio);

// Actualizar un laboratorio
router.put('/:id', soloAdminOCoordinador, updateLaboratorio);

// Eliminar un laboratorio
router.delete('/:id', soloAdminOCoordinador, deleteLaboratorio);

// RUTAS DE ESTACIONES
// Obtener estaciones de un laboratorio (GET libre)
router.get('/:id/estaciones', getEstaciones);

// Agregar estaciones a un laboratorio
router.post('/:id/estaciones', soloAdminOCoordinador, addEstaciones);

// Eliminar una estacion
router.delete('/estacion/:id', soloAdminOCoordinador, deleteEstacion);

// Actualizar una estacion
router.put('/estacion/:id', soloAdminOCoordinador, updateEstacion);

module.exports = router;
