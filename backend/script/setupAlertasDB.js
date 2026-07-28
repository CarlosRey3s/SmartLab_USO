require('dotenv').config();
const { pool } = require('../src/config/db');

const setupAlertasDB = async () => {
  try {
    console.log('⏳ Iniciando la configuración de la base de datos para Alertas...');

    // 1. Crear ENUMS si no existen
    const createEnumsQuery = `
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alerta_enum') THEN
              CREATE TYPE tipo_alerta_enum AS ENUM ('daño', 'bajo_stock', 'agotado', 'extravio', 'otro');
              RAISE NOTICE 'Enum tipo_alerta_enum creado.';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_alerta_enum') THEN
              CREATE TYPE estado_alerta_enum AS ENUM ('pendiente', 'en_revision', 'resuelto', 'descartado');
              RAISE NOTICE 'Enum estado_alerta_enum creado.';
          END IF;
      END$$;
    `;
    await pool.query(createEnumsQuery);
    console.log('✅ Enums verificados/creados.');

    // 2. Crear Tabla
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS alertas_inventario (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL REFERENCES item_inventario(id) ON DELETE CASCADE,
          actividad_id INTEGER REFERENCES actividades(id) ON DELETE SET NULL,
          usuario_reporta_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          
          tipo_problema tipo_alerta_enum NOT NULL,
          descripcion TEXT NOT NULL,
          cantidad_afectada INT NOT NULL DEFAULT 1 CHECK (cantidad_afectada > 0),
          estado estado_alerta_enum NOT NULL DEFAULT 'pendiente',
          
          fecha_reporte TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          fecha_resolucion TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          resuelto_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
      );
    `;
    await pool.query(createTableQuery);
    console.log('✅ Tabla alertas_inventario verificada/creada.');

    // 3. Crear Índices
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas_inventario(estado);
      CREATE INDEX IF NOT EXISTS idx_alertas_item ON alertas_inventario(item_id);
      CREATE INDEX IF NOT EXISTS idx_alertas_actividad ON alertas_inventario(actividad_id);
      
      CREATE TABLE IF NOT EXISTS historial_alertas (
          id SERIAL PRIMARY KEY,
          alerta_id INTEGER NOT NULL REFERENCES alertas_inventario(id) ON DELETE CASCADE,
          estado_anterior estado_alerta_enum,
          estado_nuevo estado_alerta_enum NOT NULL,
          cambiado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          comentario TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_historial_alerta ON historial_alertas(alerta_id);
    `;
    await pool.query(createIndexesQuery);
    console.log('✅ Índices verificados/creados.');

    console.log('🎉 ¡Base de datos para alertas configurada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al configurar la base de datos:', error);
    process.exit(1);
  }
};

setupAlertasDB();
