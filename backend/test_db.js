const { pool } = require('./src/config/db');
async function run() {
  try {
    const res = await pool.query('SELECT correo, password_hash, estado FROM usuarios');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
