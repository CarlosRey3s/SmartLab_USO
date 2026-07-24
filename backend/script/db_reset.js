const { pool } = require('../src/config/db');

async function main() {
    try {
        console.log("⚠️ Ejecutando reinicio completo de la base de datos...");
        console.log("Esto eliminará toda la información pero mantendrá la estructura de las tablas...");

        await pool.query(`
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
                LOOP
                    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE;';
                END LOOP;
            END $$;
        `);

        console.log("✅ Base de datos reseteada con éxito (TRUNCATE CASCADE aplicado).");
    } catch (err) {
        console.error("❌ Error al reiniciar la base de datos:", err);
    } finally {
        pool.end();
    }
}

main();
