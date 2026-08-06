const { pool } = require('../src/config/db');

async function actualizarBD() {
    try {
        console.log("🚀 Iniciando actualización del esquema de la base de datos...");

        // PASO 1: Agregar el estado 'rechazada' a estado_reserva_enum
        console.log("Paso 1: Agregando 'rechazada' a estado_reserva_enum...");
        try {
            await pool.query("ALTER TYPE estado_reserva_enum ADD VALUE IF NOT EXISTS 'rechazada';");
            console.log("✅ Estado 'rechazada' agregado con éxito.");
        } catch (err) {
            if (err.code === '42710' || err.message.includes('ya existe')) {
                console.log("⚠️ El estado 'rechazada' ya existe en estado_reserva_enum.");
            } else {
                throw err;
            }
        }

        // PASO 2: Agregar campos resuelto_por y fecha_resolucion a reservas_estudiantes
        console.log("Paso 2: Agregando campos a reservas_estudiantes...");
        try {
            await pool.query(`
                ALTER TABLE reservas_estudiantes
                ADD COLUMN IF NOT EXISTS resuelto_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMP WITH TIME ZONE DEFAULT NULL;
            `);
            console.log("✅ Campos resuelto_por y fecha_resolucion agregados con éxito.");
        } catch (err) {
            if (err.code === '42701' || err.message.includes('ya existe')) {
                console.log("⚠️ Los campos ya existen en la tabla reservas_estudiantes.");
            } else {
                throw err;
            }
        }

        // PASO 3: Agregar rol 'supervisor' a rol_usuario_enum
        console.log("Paso 3: Agregando rol 'supervisor' a rol_usuario_enum...");
        try {
            await pool.query("ALTER TYPE rol_usuario_enum ADD VALUE IF NOT EXISTS 'supervisor';");
            console.log("✅ Rol 'supervisor' agregado con éxito.");
        } catch (err) {
            if (err.code === '42710' || err.message.includes('ya existe')) {
                console.log("⚠️ El rol 'supervisor' ya existe en rol_usuario_enum.");
            } else {
                throw err;
            }
        }

        // PASO 4: Agregar columna roles_permitidos a la tabla laboratorios
        console.log("Paso 4: Agregando columna roles_permitidos a la tabla laboratorios...");
        try {
            await pool.query(`
                ALTER TABLE laboratorios 
                ADD COLUMN IF NOT EXISTS roles_permitidos JSONB DEFAULT '["todos"]'::jsonb;
            `);
            console.log("✅ Columna roles_permitidos agregada correctamente.");
        } catch (err) {
            console.error("❌ Error al agregar la columna roles_permitidos:", err);
            throw err;
        }

        console.log("✨ Actualización del esquema finalizada con éxito.");
    } catch (err) {
        console.error("❌ Error general durante la actualización:", err);
    } finally {
        pool.end();
    }
}

actualizarBD();
