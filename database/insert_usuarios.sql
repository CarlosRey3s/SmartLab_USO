-- ==========================================================
-- INSERTS PARA LA TABLA USUARIOS
-- ==========================================================

USE sistema_laboratorio;

-- Contraseña: 'password123' (hash de bcrypt opcional, el sistema tiene fallback para texto plano en desarrollo)
INSERT INTO USUARIOS (nombres, apellidos, expediente, correo, password_hash, rol, estado) VALUES 
('Admin', 'Sistema', 'ADMIN001', 'admin@uso.edu.sv', 'password123', 'admin', 'activo'),
('Juan', 'Pérez', 'JP23001', 'juan.perez@universidad.edu.sv', 'password123', 'estudiante', 'activo'),
('Maria', 'García', 'MG23005', 'maria.garcia@universidad.edu.sv', 'password123', 'estudiante', 'activo');

-- Verificación
-- SELECT * FROM USUARIOS;
