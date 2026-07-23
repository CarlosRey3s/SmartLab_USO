const { pool } = require('../src/config/db');

async function main() {
    try {
        console.log("Ejecutando ALTER TYPE...");
        await pool.query("ALTER TYPE rol_usuario_enum ADD VALUE IF NOT EXISTS 'supervisor';");
        console.log("Rol supervisor agregado con éxito.");
    } catch (err) {
        console.error("Error al ejecutar la consulta:", err);
    } finally {
        pool.end();
    }
}

main();
