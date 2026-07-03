const inventarioService = require('../services/inventario.service');

// Obtener todo el inventario
const getInventario = async (req, res) => {
  try {
    const inventario = await inventarioService.obtenerTodoElInventario();
    res.json({
      status: 'success',
      data: inventario
    });
  } catch (error) {
    console.error('Error al obtener el inventario:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al obtener inventario' });
  }
};

// Crear un nuevo item de inventario
const crearItem = async (req, res) => {
  try {
    const nuevoItem = await inventarioService.crearItemInventario(req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Item de inventario creado exitosamente',
      data: nuevoItem
    });
  } catch (error) {
    console.error('Error al crear item de inventario:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al crear item' });
  }
};

// Obtener movimientos de un item específico
const getMovimientosPorItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const movimientos = await inventarioService.obtenerMovimientosPorItem(itemId);
    res.json({
      status: 'success',
      data: movimientos
    });
  } catch (error) {
    console.error('Error al obtener los movimientos:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al obtener movimientos' });
  }
};

// Crear un nuevo movimiento de inventario (ingreso, egreso, ajuste)
const crearMovimiento = async (req, res) => {
  try {
    const nuevoMovimiento = await inventarioService.crearMovimientoInventario(req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Movimiento registrado exitosamente',
      data: nuevoMovimiento
    });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al registrar movimiento' });
  }
};

// Actualizar un item del inventario
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const itemActualizado = await inventarioService.actualizarItemInventario(id, req.body);
    
    if (!itemActualizado) {
      return res.status(404).json({ status: 'error', message: 'Item no encontrado' });
    }

    res.json({
      status: 'success',
      message: 'Item actualizado exitosamente',
      data: itemActualizado
    });
  } catch (error) {
    console.error('Error al actualizar item de inventario:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al actualizar item' });
  }
};

// Eliminar un item del inventario
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const itemEliminado = await inventarioService.eliminarItemInventario(id);
    
    if (!itemEliminado) {
      return res.status(404).json({ status: 'error', message: 'Item no encontrado' });
    }

    res.json({
      status: 'success',
      message: 'Item eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar item de inventario:', error);
    if (error.code === '23503') { // foreign key violation
      return res.status(400).json({ status: 'error', message: 'No se puede eliminar el ítem porque tiene movimientos asociados' });
    }
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al eliminar item' });
  }
};

module.exports = {
  getInventario,
  crearItem,
  updateItem,
  deleteItem,
  getMovimientosPorItem,
  crearMovimiento
};
