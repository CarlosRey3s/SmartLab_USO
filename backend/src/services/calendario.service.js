const { pool } = require('../config/db');

// Obtener todas las actividades del calendario con sus detalles específicos
const obtenerActividades = async () => {
  const query = `
    SELECT 
      a.id, a.laboratorio_id, a.tipo, a.fecha_hora_inicio, a.fecha_hora_fin, a.recurrencia, a.fecha_creacion,
      -- Campos de clases
      c.materia, c.docente_id, c.num_estudiantes,
      -- Campos de reservas
      r.usuario_id as reserva_usuario_id, r.estacion_id, r.titulo, r.nota_adicional, r.estado_reserva,
      -- Campos de mantenimientos
      m.tecnico_id, m.descripcion_ti
    FROM actividades a
    LEFT JOIN clases_academicas c ON a.id = c.actividad_id
    LEFT JOIN reservas_estudiantes r ON a.id = r.actividad_id
    LEFT JOIN mantenimientos m ON a.id = m.actividad_id
    ORDER BY a.fecha_hora_inicio ASC
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Crear una nueva actividad base y su registro específico según el tipo
const crearActividad = async (actividadData) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Iniciar transacción
    
    // 1. Insertar en tabla base
    const { laboratorio_id, tipo, fecha_hora_inicio, fecha_hora_fin, recurrencia } = actividadData;
    const queryBase = `
      INSERT INTO actividades (laboratorio_id, tipo, fecha_hora_inicio, fecha_hora_fin, recurrencia)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, laboratorio_id, tipo, fecha_hora_inicio, fecha_hora_fin, recurrencia, fecha_creacion;
    `;
    const valoresBase = [laboratorio_id, tipo, fecha_hora_inicio, fecha_hora_fin, recurrencia || null];
    const resBase = await client.query(queryBase, valoresBase);
    const actividad = resBase.rows[0];
    const actividadId = actividad.id;

    // 2. Insertar en tabla hija según el tipo
    let detallesEspecificos = {};
    
    if (tipo === 'clase') {
      const { materia, docente_id, num_estudiantes } = actividadData;
      const qClase = `
        INSERT INTO clases_academicas (actividad_id, materia, docente_id, num_estudiantes)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const resClase = await client.query(qClase, [actividadId, materia, docente_id, num_estudiantes]);
      detallesEspecificos = resClase.rows[0];
    } 
    else if (tipo === 'reserva') {
      const { usuario_id, estacion_id, titulo, nota_adicional, estado_reserva } = actividadData;
      const qReserva = `
        INSERT INTO reservas_estudiantes (actividad_id, usuario_id, estacion_id, titulo, nota_adicional, estado_reserva)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const resReserva = await client.query(qReserva, [
        actividadId, usuario_id, estacion_id || null, titulo, nota_adicional || '', estado_reserva || 'pendiente'
      ]);
      detallesEspecificos = resReserva.rows[0];
    } 
    else if (tipo === 'mantenimiento') {
      const { tecnico_id, descripcion_ti } = actividadData;
      const qMantenimiento = `
        INSERT INTO mantenimientos (actividad_id, tecnico_id, descripcion_ti)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      const resMantenimiento = await client.query(qMantenimiento, [actividadId, tecnico_id, descripcion_ti]);
      detallesEspecificos = resMantenimiento.rows[0];
    } else {
      throw new Error("Tipo de actividad no válido. Debe ser 'clase', 'reserva' o 'mantenimiento'.");
    }

    await client.query('COMMIT'); // Confirmar transacción
    
    // Retornamos todo junto
    return { ...actividad, detalles: detallesEspecificos };
    
  } catch (error) {
    await client.query('ROLLBACK'); // Deshacer si hay error
    throw error;
  } finally {
    client.release(); // Liberar conexión
  }
};

module.exports = {
  obtenerActividades,
  crearActividad
};
