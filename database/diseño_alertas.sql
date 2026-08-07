-- ===========================================================================
-- DISEÑO DE TABLA: ALERTAS DE INVENTARIO
-- ===========================================================================
-- Esta tabla permite llevar el registro de incidencias (daños, extravíos, etc.)
-- ocurridos con los ítems del inventario, y vincularlos opcionalmente a 
-- una reserva/actividad específica.

-- 1. Tipos ENUM para estandarizar los datos de las alertas
CREATE TYPE tipo_alerta_enum AS ENUM ('daño', 'agotado', 'prestamo', 'extravio', 'otro');
CREATE TYPE estado_alerta_enum AS ENUM ('pendiente', 'en_revision', 'resuelto', 'devuelto', 'descartado');

-- 2. Estructura de la tabla
CREATE TABLE alertas_inventario (
    id SERIAL PRIMARY KEY,
    
    -- Relación con el ítem del inventario que sufrió la incidencia
    item_id INTEGER NOT NULL REFERENCES item_inventario(id) ON DELETE CASCADE,
    
    -- Relación opcional con la reserva durante la cual ocurrió la incidencia
    actividad_id INTEGER REFERENCES actividades(id) ON DELETE SET NULL,
    
    -- Usuario que reportó la alerta (puede ser el estudiante, docente o coordinador)
    usuario_reporta_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Detalles específicos del problema
    tipo_problema tipo_alerta_enum NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad_afectada INT NOT NULL DEFAULT 1 CHECK (cantidad_afectada > 0),
    
    -- Estado actual de la incidencia
    estado estado_alerta_enum NOT NULL DEFAULT 'pendiente',
    
    -- Trazabilidad de tiempo
    fecha_reporte TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Usuario (Coordinador/Admin) que resolvió la alerta
    resuelto_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 3. Índices recomendados para optimizar búsquedas frecuentes
CREATE INDEX idx_alertas_estado ON alertas_inventario(estado);
CREATE INDEX idx_alertas_item ON alertas_inventario(item_id);
CREATE INDEX idx_alertas_actividad ON alertas_inventario(actividad_id);
