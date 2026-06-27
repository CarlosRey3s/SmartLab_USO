-- ==========================================================
-- INSERTS PARA LA TABLA LABORATORIOS
-- ==========================================================

USE sistema_laboratorio;

INSERT INTO LABORATORIOS (nombre, descripcion, estado) VALUES 
('Laboratorio L1', 'Equipado con instrumentos para prácticas de Física, Estática y Dinámica. Cuenta con bancos de trabajo y equipo de medición básica.', 'activo'),
('Laboratorio L2', 'Especializado en Electrónica y Robótica. Incluye osciloscopios, fuentes de poder y estaciones de soldadura.', 'activo'),
('Laboratorio L3', 'Laboratorio de Sistemas Digitales y Computación. Equipado con computadoras de alto rendimiento y kits de desarrollo microcontrolado.', 'activo');

-- Verificación de los datos insertados
-- SELECT * FROM LABORATORIOS;
