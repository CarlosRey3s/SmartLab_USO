const express = require('express');
const router = express.Router();
const { getAllLaboratorios, createLaboratorio, updateLaboratorio, deleteLaboratorio, getEstaciones, addEstaciones, deleteEstacion, updateEstacion } = require('../controllers/laboratorio.controller');

// RUTAS CRUD DE LABORATORIOS
// /api/laboratorios

// Obtener todos los laboratorios
router.get('/', getAllLaboratorios);

// Crear un nuevo laboratorio
router.post('/', createLaboratorio);

// Actualizar un laboratorio
router.put('/:id', updateLaboratorio);

// Eliminar un laboratorio
router.delete('/:id', deleteLaboratorio);

// RUTAS DE ESTACIONES
// Obtener estaciones de un laboratorio
router.get('/:id/estaciones', getEstaciones);

// Agregar estaciones a un laboratorio
router.post('/:id/estaciones', addEstaciones);

// Eliminar una estacion
router.delete('/estacion/:id', deleteEstacion);

// Actualizar una estacion
router.put('/estacion/:id', updateEstacion);

module.exports = router;
