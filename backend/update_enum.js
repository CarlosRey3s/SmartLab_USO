const { pool } = require('./src/config/db');

async function run() {
    try {
        await pool.query(`ALTER TYPE estado_reserva_enum ADD VALUE IF NOT EXISTS 'ausente'`);
        console.log("Enum actualizado correctamente a ausente");
    } catch(e) {
        console.error("Error actualizando DB:", e);
    } finally {
        pool.end();
    }
}
run();
