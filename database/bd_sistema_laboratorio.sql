-- ==========================================================
-- SISTEMA DE GESTIÓN DE LABORATORIOS (MYSQL FINAL)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS sistema_laboratorio;
USE sistema_laboratorio;

-- 1. TABLAS MAESTRAS
-- ----------------------------------------------------------

CREATE TABLE LABORATORIOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE USUARIOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    expediente VARCHAR(20) UNIQUE NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    carrera VARCHAR(100),
    rol ENUM('admin', 'estudiante', 'docente') NOT NULL,
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MESAS
-- ----------------------------------------------------------

CREATE TABLE MESAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_laboratorio_id INT NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    capacidad INT,
    estado ENUM('disponible', 'ocupada', 'mantenimiento') DEFAULT 'disponible',
    FOREIGN KEY (FK_laboratorio_id) REFERENCES LABORATORIOS(id) ON DELETE CASCADE
);

-- 3. INVENTARIO
-- ----------------------------------------------------------

CREATE TABLE ITEMS_INVENTARIO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_laboratorio_id INT,
    nombre VARCHAR(100) NOT NULL,
    codigo_interno VARCHAR(50) UNIQUE,
    numero_cas VARCHAR(50), 
    categoria VARCHAR(50),
    ubicacion_fisica VARCHAR(100),
    unidad_medida VARCHAR(20),
    tipo_control ENUM('entero', 'decimal'),
    cantidad_stock DECIMAL(10,2) DEFAULT 0,
    stock_minimo DECIMAL(10,2) DEFAULT 0,
    imagen_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FK_laboratorio_id) REFERENCES LABORATORIOS(id) ON DELETE SET NULL
);

CREATE TABLE MOVIMIENTOS_INVENTARIO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_item_id INT NOT NULL,
    FK_usuario_id INT NOT NULL,
    tipo_movimiento ENUM('ingreso', 'consumo') NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    FOREIGN KEY (FK_item_id) REFERENCES ITEMS_INVENTARIO(id) ON DELETE CASCADE,
    FOREIGN KEY (FK_usuario_id) REFERENCES USUARIOS(id)
);

-- 4. RESERVAS
-- ----------------------------------------------------------

CREATE TABLE RESERVAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_estudiante_id INT NOT NULL,
    FK_mesa_id INT NOT NULL,
    titulo VARCHAR(150),
    fecha_hora_inicio DATETIME NOT NULL,
    fecha_hora_fin DATETIME NOT NULL,
    num_estudiantes INT,
    nota_adicional TEXT,
    estado ENUM('pendiente', 'aprobada', 'cancelada', 'completada'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_hora_fin > fecha_hora_inicio),
    FOREIGN KEY (FK_estudiante_id) REFERENCES USUARIOS(id),
    FOREIGN KEY (FK_mesa_id) REFERENCES MESAS(id) ON DELETE CASCADE
);

CREATE TABLE RESERVA_ITEMS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_reserva_id INT NOT NULL,
    FK_item_id INT NOT NULL,
    cantidad_solicitada DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (FK_reserva_id) REFERENCES RESERVAS(id) ON DELETE CASCADE,
    FOREIGN KEY (FK_item_id) REFERENCES ITEMS_INVENTARIO(id)
);

-- 5. ACTIVIDADES
-- ----------------------------------------------------------

CREATE TABLE ACTIVIDADES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_docente_id INT,
    FK_laboratorio_id INT NOT NULL,
    FK_creado_por INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    tipo ENUM('clase', 'reserva', 'mant'),
    fecha_hora_inicio DATETIME NOT NULL,
    fecha_hora_fin DATETIME NOT NULL,
    repetir_semanalmente TINYINT(1) DEFAULT 0,
    num_estudiantes INT,
    nota_adicional TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_hora_fin > fecha_hora_inicio),
    FOREIGN KEY (FK_docente_id) REFERENCES USUARIOS(id),
    FOREIGN KEY (FK_laboratorio_id) REFERENCES LABORATORIOS(id),
    FOREIGN KEY (FK_creado_por) REFERENCES USUARIOS(id)
);

CREATE TABLE ACTIVIDAD_ITEMS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_actividad_id INT NOT NULL,
    FK_item_id INT NOT NULL,
    cantidad_usada DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (FK_actividad_id) REFERENCES ACTIVIDADES(id) ON DELETE CASCADE,
    FOREIGN KEY (FK_item_id) REFERENCES ITEMS_INVENTARIO(id)
);

-- 6. EVALUACIONES
-- ----------------------------------------------------------

CREATE TABLE EVALUACIONES_PLANTILLA (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_creado_por INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tiempo_limite_minutos INT DEFAULT 30,
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FK_creado_por) REFERENCES USUARIOS(id)
);

CREATE TABLE BANCO_PREGUNTAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_admin_id INT NOT NULL,
    enunciado TEXT NOT NULL,
    tipo_pregunta ENUM('opcion_multiple', 'verdadero_falso', 'abierta'),
    categoria VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FK_admin_id) REFERENCES USUARIOS(id)
);

CREATE TABLE EVALUACION_CONTENIDO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_plantilla_id INT NOT NULL,
    FK_pregunta_id INT NOT NULL,
    orden INT,
    puntos_valor DECIMAL(5,2) DEFAULT 1.0,
    FOREIGN KEY (FK_plantilla_id) REFERENCES EVALUACIONES_PLANTILLA(id) ON DELETE CASCADE,
    FOREIGN KEY (FK_pregunta_id) REFERENCES BANCO_PREGUNTAS(id)
);

CREATE TABLE PREGUNTA_OPCIONES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_pregunta_id INT NOT NULL,
    texto_opcion TEXT NOT NULL,
    es_correcta TINYINT(1) DEFAULT 0,
    FOREIGN KEY (FK_pregunta_id) REFERENCES BANCO_PREGUNTAS(id) ON DELETE CASCADE
);

-- 7. EJECUCIÓN DE EVALUACIONES
-- ----------------------------------------------------------

CREATE TABLE EVALUACIONES_ASIGNADAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_plantilla_id INT NOT NULL,
    FK_estudiante_id INT NOT NULL,
    FK_laboratorio_id INT NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME,
    intento_numero INT NOT NULL DEFAULT 1,
    calificacion_final DECIMAL(5,2),
    estado ENUM('pendiente', 'en_progreso', 'completada'),
    FOREIGN KEY (FK_plantilla_id) REFERENCES EVALUACIONES_PLANTILLA(id),
    FOREIGN KEY (FK_estudiante_id) REFERENCES USUARIOS(id),
    FOREIGN KEY (FK_laboratorio_id) REFERENCES LABORATORIOS(id)
);

CREATE TABLE RESPUESTAS_ESTUDIANTE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_evaluacion_asignada_id INT NOT NULL,
    FK_pregunta_id INT NOT NULL,
    FK_opcion_seleccionada_id INT,
    respuesta_texto TEXT,
    puntaje_obtenido DECIMAL(5,2),
    UNIQUE (FK_evaluacion_asignada_id, FK_pregunta_id),
    FOREIGN KEY (FK_evaluacion_asignada_id) REFERENCES EVALUACIONES_ASIGNADAS(id) ON DELETE CASCADE,
    FOREIGN KEY (FK_pregunta_id) REFERENCES BANCO_PREGUNTAS(id),
    FOREIGN KEY (FK_opcion_seleccionada_id) REFERENCES PREGUNTA_OPCIONES(id)
);