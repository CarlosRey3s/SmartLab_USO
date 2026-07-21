const { pool } = require('../config/db');

const obtenerSugerencias = async () => {
  const query = `
    SELECT 
      bs.id, 
      bs.usuario_id,
      bs.titulo, 
      bs.comentario, 
      bs.estado_gestion, 
      bs.respuesta_coordinador, 
      bs.fecha_envio,
      u.nombre AS usuario_nombre,
      u.apellido AS usuario_apellido,
      u.correo AS usuario_correo,
      u.rol AS usuario_rol,
      l.nombre AS laboratorio_nombre
    FROM buzon_sugerencias bs
    JOIN usuarios u ON bs.usuario_id = u.id
    LEFT JOIN laboratorios l ON bs.laboratorio_id = l.id
    ORDER BY bs.fecha_envio DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const crearSugerencia = async (sugerenciaData) => {
  const { usuario_id, laboratorio_id, titulo, comentario } = sugerenciaData;
  const query = `
    INSERT INTO buzon_sugerencias (usuario_id, laboratorio_id, titulo, comentario, estado_gestion)
    VALUES ($1, $2, $3, $4, 'pendiente')
    RETURNING *;
  `;
  // Usamos null si el laboratorio_id es vacío o nulo
  const labId = laboratorio_id ? laboratorio_id : null;
  const result = await pool.query(query, [usuario_id, labId, titulo, comentario]);
  return result.rows[0];
};

const actualizarSugerencia = async (id, updateData) => {
  const { estado_gestion, respuesta_coordinador } = updateData;
  
  // Construcción dinámica de la query
  let query = 'UPDATE buzon_sugerencias SET ';
  const values = [];
  let setClauses = [];
  let index = 1;

  if (estado_gestion !== undefined) {
    setClauses.push(`estado_gestion = $${index++}`);
    values.push(estado_gestion);
  }

  if (respuesta_coordinador !== undefined) {
    setClauses.push(`respuesta_coordinador = $${index++}`);
    values.push(respuesta_coordinador);
  }

  if (setClauses.length === 0) return null;

  query += setClauses.join(', ') + ` WHERE id = $${index} RETURNING *;`;
  values.push(id);

  const result = await pool.query(query, values);
  return result.rows[0];
};

const eliminarSugerencia = async (id) => {
  const query = 'DELETE FROM buzon_sugerencias WHERE id = $1 RETURNING id;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  obtenerSugerencias,
  crearSugerencia,
  actualizarSugerencia,
  eliminarSugerencia
};
