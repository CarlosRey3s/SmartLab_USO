const alertasService = require('../services/alertas.service');

// Obtener todas las alertas
const getAlertas = async (req, res) => {
  try {
    const alertas = await alertasService.obtenerTodasLasAlertas();
    res.json({
      status: 'success',
      data: alertas
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({ status: 'error', message: 'Error al obtener alertas del inventario' });
  }
};

// Crear nueva alerta manual
const createAlerta = async (req, res) => {
  try {
    const { item_id, tipo_problema, descripcion, cantidad_afectada, actividad_id } = req.body;

    if (!item_id || !tipo_problema || !descripcion) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos obligatorios (item_id, tipo_problema, descripcion)' });
    }

    const nuevaAlerta = await alertasService.crearAlerta({
      item_id,
      actividad_id,
      usuario_reporta_id: req.usuario ? req.usuario.id : null, // req.usuario viene del JWT
      tipo_problema,
      descripcion,
      cantidad_afectada,
      estado: 'pendiente'
    });

    res.status(201).json({
      status: 'success',
      message: 'Alerta creada exitosamente',
      data: nuevaAlerta
    });
  } catch (error) {
    console.error('Error al crear alerta:', error);
    res.status(500).json({ status: 'error', message: 'Error interno al crear la alerta' });
  }
};

// Actualizar el estado de la alerta (ej: resolverla, en revision)
const updateAlertaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ status: 'error', message: 'Debe enviar un nuevo estado' });
    }

    // Quién resuelve es quien hace la petición
    const resuelto_por_id = req.usuario ? req.usuario.id : null;
    const alertaActualizada = await alertasService.actualizarEstadoAlerta(id, estado, resuelto_por_id);

    res.json({
      status: 'success',
      message: `Alerta actualizada a estado: ${estado}`,
      data: alertaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar estado de alerta:', error);
    if (error.message === 'Alerta no encontrada') {
      return res.status(404).json({ status: 'error', message: 'Alerta no encontrada' });
    }
    res.status(500).json({ status: 'error', message: 'Error interno al actualizar la alerta' });
  }
};

module.exports = {
  getAlertas,
  createAlerta,
  updateAlertaStatus
};
