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

module.exports = {
  getInventario,
  crearItem,
  getMovimientosPorItem,
  crearMovimiento
};
