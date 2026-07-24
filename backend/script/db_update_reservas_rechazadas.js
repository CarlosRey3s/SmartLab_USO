const { pool } = require('../src/config/db');

async function main() {
    try {
        console.log("Ejecutando actualización de base de datos...");

        // PASO 1: Agregar el estado 'rechazada' a tu catálogo de estados
        console.log("Paso 1: Agregando 'rechazada' a estado_reserva_enum...");
        try {
            await pool.query("ALTER TYPE estado_reserva_enum ADD VALUE 'rechazada';");
            console.log("✅ Estado 'rechazada' agregado con éxito.");
        } catch (err) {
            // Ignorar el error si el valor ya existe (Código de error PostgreSQL: 42710)
            if (err.code === '42710' || err.message.includes('ya existe')) {
                console.log("⚠️ El estado 'rechazada' ya existe en estado_reserva_enum.");
            } else {
                throw err;
            }
        }

        // PASO 2: Agregar los campos de trazabilidad a la tabla hija
        console.log("Paso 2: Agregando campos a reservas_estudiantes...");
        try {
            await pool.query(`
                ALTER TABLE reservas_estudiantes
                ADD COLUMN resuelto_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                ADD COLUMN fecha_resolucion TIMESTAMP WITH TIME ZONE DEFAULT NULL;
            `);
            console.log("✅ Campos resuelto_por y fecha_resolucion agregados con éxito.");
        } catch (err) {
            // Ignorar el error si la columna ya existe (Código de error PostgreSQL: 42701)
            if (err.code === '42701' || err.message.includes('ya existe')) {
                console.log("⚠️ Los campos ya existen en la tabla reservas_estudiantes.");
            } else {
                throw err;
            }
        }
        // PASO 3: Agregar rol 'supervisor' a rol_usuario_enum
        console.log("Paso 3: Agregando rol 'supervisor'...");
        try {
            await pool.query("ALTER TYPE rol_usuario_enum ADD VALUE 'supervisor';");
            console.log("✅ Rol supervisor agregado con éxito.");
        } catch (err) {
            if (err.code === '42710' || err.message.includes('ya existe')) {
                console.log("⚠️ El rol 'supervisor' ya existe en rol_usuario_enum.");
            } else {
                // If it fails because IF NOT EXISTS is not supported, the error above catches it if it exists.
                // If the user already used IF NOT EXISTS in postgres 12+, we can also just use that directly, but the catch is safer for all versions.
                throw err;
            }
        }

        console.log("✨ Actualización finalizada con éxito.");
    } catch (err) {
        console.error("❌ Error general al ejecutar la consulta:", err);
    } finally {
        pool.end();
    }
}

main();
