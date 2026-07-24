const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log("🌱 Ejecutando seed de datos de prueba...");

        // Leer el archivo SQL
        const sqlFilePath = path.join(__dirname, '../../database/script.txt');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        // Ejecutar las sentencias
        await pool.query(sql);

        console.log("✅ Datos de prueba insertados con éxito.");
    } catch (err) {
        console.error("❌ Error al insertar los datos de prueba:", err);
    } finally {
        pool.end();
    }
}

main();
