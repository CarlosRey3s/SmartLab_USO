# Diseño de Alertas de Inventario

Este documento explica la estructura y la lógica de negocio detrás del sistema de Alertas e Incidencias del Inventario en la plataforma SmartLab.

## 1. Lógica de Funcionamiento (Workflow)

El sistema de alertas divide los problemas en dos categorías principales según cómo se resuelven: **Manuales** y **Automáticas**.

### A. Alertas Automáticas (Reactividad del Sistema)
Estas alertas son generadas y resueltas por el propio sistema (el backend) sin necesidad de que el coordinador interactúe directamente con el botón de "Resolver".

* **Generación:** Cuando el `cantidad_actual` de un ítem cae a un valor menor o igual a su `stock_minimo` (o a 0), el sistema automáticamente crea una alerta de tipo `bajo_stock` o `agotado` con estado `pendiente`. Se notifica automáticamente al coordinador de ese laboratorio.
* **Resolución (Suministros de un solo uso):** Cuando el coordinador va al sistema y realiza un ajuste positivo de inventario (agrega nuevo stock físico), la `cantidad_actual` sube. El sistema detecta que el stock ya es mayor al mínimo y **cierra (resuelve) la alerta automáticamente**.
* **Resolución (Equipos Prestados):** Si un equipo se agota porque todo el inventario está prestado, la alerta se genera. Al final del día, conforme los estudiantes devuelven los equipos, el stock vuelve a subir. Cuando supera el mínimo, la alerta **se resuelve sola**.

### B. Alertas Manuales (Reportes Espontáneos o Accidentes)
Estas alertas se generan manualmente por el coordinador para reportar incidencias que ocurren **fuera** del flujo normal de préstamos (eventos fortuitos).

* **Generación:** El coordinador levanta una alerta cuando un ítem sufre daños por causas ajenas al uso de los estudiantes. Ejemplos: desastres naturales (temblores, goteras), estantes viejos que colapsaron, animales que dañaron los equipos, accidentes de un ayudante durante la limpieza, o pérdidas/extravíos detectados al hacer revisión de inventario.
* **Proceso:** La alerta nace en estado `pendiente`. Luego, el coordinador la pasa a `en_revision` mientras evalúa si el equipo tiene arreglo, si hay que mandarlo a un técnico, o si debe darse de baja.
* **Resolución:** Una vez que se repara el equipo (o se toma una decisión definitiva), el coordinador marca manualmente la alerta como `resuelto`. El sistema guarda quién cerró la incidencia y la fecha exacta.

### C. Flujo de Préstamos (Reservas de Ítems)
*Nota Arquitectónica: Los préstamos y sus estados ("Entregado", "Devuelto") son operaciones normales del laboratorio y se manejan en las tablas de `actividades` y `reserva_items`. El módulo de Alertas solo interviene si ocurre una anomalía durante este flujo.*

1. **Revisión y Entrega:** Cuando se entregan físicamente los equipos, el estado en la tabla de la reserva cambia a `entregado` (No genera alerta).
2. **Aviso de Finalización:** El sistema envía una notificación al coordinador indicando que la reserva finalizó.
3. **Confirmación de Devolución:** El estudiante/docente devuelve los equipos. El coordinador los inspecciona y presiona **"Marcar Devuelto"**. La alerta de préstamo se cierra y el ciclo de la solicitud termina.
4. **Reporte de Daños en Devolución:** Si al inspeccionarlo el coordinador nota que el ítem viene dañado, marca el préstamo original como devuelto, pero el sistema automáticamente **crea una nueva alerta separada** de tipo `daño`. Esta nueva alerta:
   - Queda vinculada a la misma reserva (`actividad_id`) para saber quién lo dañó.
   - Permite al coordinador agregar una descripción detallada (ej. "Daño por mal uso", "Desgaste natural", "Pieza faltante").
   - Nace en estado `pendiente` para iniciar su propio ciclo de reparación.
5. **Daño Preexistente (Devolución Inmediata):** Si el estudiante o docente nota que el equipo no funciona apenas comienza a utilizarlo, puede devolverlo inmediatamente. En este caso, el coordinador cierra la reserva y levanta la alerta de daño especificando en la descripción **"Falla previa / No es culpa del usuario"**. De esta forma, el daño entra a revisión, el historial del estudiante queda limpio, y **se le puede asignar un reemplazo funcional inmediatamente** (generando un nuevo préstamo) siempre y cuando haya stock disponible en el inventario.

---

## 2. Estructura de Base de Datos (SQL)

A continuación, el script SQL actualizado con los tipos y campos necesarios para soportar esta lógica:

```sql
-- 1. Tipos ENUM para estandarizar los datos de las alertas (Exclusivo para anomalías)
CREATE TYPE tipo_alerta_enum AS ENUM ('daño', 'bajo_stock', 'agotado', 'extravio', 'otro');

-- Tipos de estado por los que puede pasar una alerta
CREATE TYPE estado_alerta_enum AS ENUM ('pendiente', 'en_revision', 'resuelto', 'descartado');

-- 2. Estructura de la tabla principal
CREATE TABLE alertas_inventario (
    id SERIAL PRIMARY KEY,
    
    -- Relación con el ítem del inventario que sufrió la incidencia
    item_id INTEGER NOT NULL REFERENCES item_inventario(id) ON DELETE CASCADE,
    
    -- Relación opcional con la reserva durante la cual ocurrió la incidencia (útil para daños en préstamos)
    actividad_id INTEGER REFERENCES actividades(id) ON DELETE SET NULL,
    
    -- Usuario que reportó la alerta. 
    -- Si es NULL, significa que la alerta fue GENERADA AUTOMÁTICAMENTE por el sistema (ej. bajo stock)
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
    
    -- Usuario (Coordinador/Admin) que resolvió la alerta.
    resuelto_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 3. Tabla de Trazabilidad (Historial de Alertas)
CREATE TABLE historial_alertas (
    id SERIAL PRIMARY KEY,
    alerta_id INTEGER NOT NULL REFERENCES alertas_inventario(id) ON DELETE CASCADE,
    estado_anterior estado_alerta_enum,
    estado_nuevo estado_alerta_enum NOT NULL,
    cambiado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    comentario TEXT
);

-- 4. Índices recomendados para optimizar búsquedas frecuentes
CREATE INDEX idx_alertas_estado ON alertas_inventario(estado);
CREATE INDEX idx_alertas_item ON alertas_inventario(item_id);
CREATE INDEX idx_alertas_actividad ON alertas_inventario(actividad_id);
CREATE INDEX idx_historial_alerta ON historial_alertas(alerta_id);
```

---

## 3. Control de Disponibilidad (Prevención de Choques)

Para garantizar que el laboratorio nunca prometa equipos que no tiene y evitar que las reservas choquen en el tiempo, el sistema implementa un control de **Disponibilidad Proyectada (Cálculo de Traslape)**.

### Regla de Oro
**La creación de una reserva NO descuenta el equipo del inventario de golpe.** El descuento (resta a `cantidad_actual`) ocurre única y exclusivamente cuando el coordinador hace la entrega física (Botón *"Entregar"*).

### ¿Cómo detecta choques el sistema?
Cuando un usuario intenta reservar una cantidad $X$ de equipos en un horario determinado (`Hora_Inicio` a `Hora_Fin`), el backend hace lo siguiente antes de guardar la reserva:

1. Busca todas las reservas que **se cruzan (traslapan)** con ese mismo rango de horas.
2. Suma la cantidad de equipos que ya están comprometidos en esas reservas superpuestas.
3. Aplica la fórmula:
   > **Stock Disponible = Stock Total Propio - Suma de equipos comprometidos**
4. **Validación (El Cuello de Botella):** El sistema siempre valida el momento de mayor uso. Si la suma de lo que pide la nueva reserva + lo que ya está comprometido excede el Stock Total, la solicitud es rechazada automáticamente. **Importante:** El sistema no solo arrojará un error genérico, sino que le informará al usuario la cantidad exacta que sí está disponible (ej. *"Solo queda 1 disponible en ese horario"*) y le sugerirá reprogramar su reserva a una hora diferente donde haya disponibilidad total.

### Ejemplo Práctico
- **Stock Total:** 4 Osciloscopios.
- **Reserva A:** 2:00 PM a 4:00 PM (Pide 3 osciloscopios).
- **Reserva B (Intento):** 1:00 PM a 3:00 PM (Intenta pedir 2 osciloscopios).
- **Resultado del Sistema:** Detecta un choque exacto de 2:00 PM a 3:00 PM. En esa hora, la Reserva A usa 3, por lo que solo queda 1 disponible. Como la Reserva B pide 2, el sistema la rechaza para proteger los recursos. En la interfaz, le muestra al estudiante: *"Para el horario de 1:00 PM a 3:00 PM solo tenemos 1 osciloscopio disponible. Por favor ajuste la cantidad o seleccione otro horario."*
