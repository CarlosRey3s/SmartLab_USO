const sugerenciaService = require('../services/sugerencia.service');

const getSugerencias = async (req, res) => {
  try {
    const { usuario_id, rol } = req.query;
    const sugerencias = await sugerenciaService.obtenerSugerencias(usuario_id, rol);
    res.json({
      status: 'success',
      data: sugerencias
    });
  } catch (error) {
    console.error('Error al obtener sugerencias:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

const crearSugerencia = async (req, res) => {
  try {
    const nuevaSugerencia = await sugerenciaService.crearSugerencia(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Sugerencia creada exitosamente',
      data: nuevaSugerencia
    });
  } catch (error) {
    console.error('Error al crear sugerencia:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al crear sugerencia' });
  }
};

const actualizarSugerencia = async (req, res) => {
  try {
    const id = req.params.id;
    const sugerenciaActualizada = await sugerenciaService.actualizarSugerencia(id, req.body);
    
    if (!sugerenciaActualizada) {
      return res.status(404).json({ status: 'error', message: 'Sugerencia no encontrada o no se proporcionaron datos' });
    }
    
    res.json({
      status: 'success',
      message: 'Sugerencia actualizada exitosamente',
      data: sugerenciaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar sugerencia:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al actualizar sugerencia' });
  }
};

const eliminarSugerencia = async (req, res) => {
  try {
    const id = req.params.id;
    const sugerenciaEliminada = await sugerenciaService.eliminarSugerencia(id);
    
    if (!sugerenciaEliminada) {
      return res.status(404).json({ status: 'error', message: 'Sugerencia no encontrada' });
    }
    
    res.json({
      status: 'success',
      message: 'Sugerencia eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar sugerencia:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al eliminar sugerencia' });
  }
};

module.exports = {
  getSugerencias,
  crearSugerencia,
  actualizarSugerencia,
  eliminarSugerencia
};
