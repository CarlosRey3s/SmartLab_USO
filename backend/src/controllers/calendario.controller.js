const calendarioService = require('../services/calendario.service');

// Obtener todas las actividades
const getActividades = async (req, res) => {
  try {
    const actividades = await calendarioService.obtenerActividades();
    res.json({
      status: 'success',
      data: actividades
    });
  } catch (error) {
    console.error('Error al obtener actividades del calendario:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al obtener calendario' });
  }
};

// Crear una nueva actividad
const crearActividad = async (req, res) => {
  try {
    const nuevaActividad = await calendarioService.crearActividad(req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Actividad creada exitosamente',
      data: nuevaActividad
    });
  } catch (error) {
    console.error('Error al crear actividad:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al crear actividad' });
  }
};

module.exports = {
  getActividades,
  crearActividad
};
