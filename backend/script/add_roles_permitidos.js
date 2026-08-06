const { pool } = require('../src/config/db');

async function updateTable() {
  try {
    console.log('Agregando columna roles_permitidos a la tabla laboratorios...');
    await pool.query(`
      ALTER TABLE laboratorios 
      ADD COLUMN IF NOT EXISTS roles_permitidos JSONB DEFAULT '["todos"]'::jsonb;
    `);
    console.log('✅ Columna añadida correctamente.');
  } catch (error) {
    console.error('❌ Error al modificar la tabla:', error);
  } finally {
    pool.end();
  }
}

updateTable();
