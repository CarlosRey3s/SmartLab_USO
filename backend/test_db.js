const { pool } = require('./src/config/db');
async function test() {
  try {
    const res = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'reservas_estudiantes'");
    console.log("reservas_estudiantes columns:", res.rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
  }
}
test();
