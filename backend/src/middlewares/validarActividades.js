const { pool } = require('../config/db');

const validarActividades = async (req, res, next) => {
    const { tipo, laboratorio, fecha, desde, hasta, usuario_id } = req.body;

    const tiposValidos = ['clase', 'mantenimiento', 'reserva'];
    if (!tipo || !tiposValidos.includes(tipo)) {
        return res.status(400).json({
            success: false,
            message: 'Tipo de actividad inválido. Debe ser "clase", "mantenimiento" o "reserva".'
        });
    }

    // Validacion de campos compartidos (obligatorios para los 3 tipos)
    if (!laboratorio || !fecha || !desde || !hasta) {
        return res.status(400).json({
            success: false,
            message: 'Faltan campos obligatorios. Laboratorio, fecha, desde y hasta son requeridos.'
        });
    }

    // Validar especificas segun el tipo que seleccione el usuario
    if (tipo === 'clase') {
        const { materia, docente, numPersonas } = req.body;
        if (!materia || !docente || !numPersonas) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios para clase. Materia, docente y numPersonas son requeridos.'
            });
        }
    } else if (tipo === 'mantenimiento') {
        const { descripcion } = req.body;
        if (!descripcion) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios para mantenimiento. La descripción es requerida.'
            });
        }
    } else if (tipo === 'reserva') { 
        const { titulo, numPersonas } = req.body;
        if (!titulo || !numPersonas) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios para reserva. Titulo y numPersonas son requeridos.'
            });
        }
    }

    // ── REGLAS DE ROLES Y PROPIEDAD DEL LABORATORIO ──
    try {
        const userId = req.usuario?.id || usuario_id; // Priorizar el ID validado del token JWT

        // Consultamos la BD para saber el rol del usuario y el coordinador del laboratorio
        const userQuery = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId]);
        const labQuery = await pool.query('SELECT coordinador_id FROM laboratorios WHERE id = $1', [laboratorio]);
        
        if (userQuery.rows.length === 0 || labQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario o Laboratorio no encontrado en la base de datos.' });
        }

        const userRole = userQuery.rows[0].rol;
        const coordinadorId = labQuery.rows[0].coordinador_id;
        const esDueño = String(coordinadorId) === String(userId);

        if (userRole === 'coordinador') {
            // Regla: Validar que al crear clases o mantenimientos, el ID coincida con el coordinador del lab
            if ((tipo === 'clase' || tipo === 'mantenimiento') && !esDueño) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado: No puedes crear clases ni mantenimientos en un laboratorio que no coordinas.'
                });
            }

            // Regla: Validar que las reservas en laboratorios ajenos queden en estado 'pendiente'
            if (tipo === 'reserva' && !esDueño) {
                req.body.estado_reserva = 'pendiente';
            } else if (tipo === 'reserva' && esDueño) {
                req.body.estado_reserva = 'aprobada'; // Se auto-aprueba si es su propio laboratorio
            }
        } 
        else if (userRole === 'docente' || userRole === 'estudiante') {
            // Según las reglas, docentes y estudiantes siempre mandan reservas como 'pendiente'
            req.body.estado_reserva = 'pendiente';
            
            // Y no pueden crear clases ni mantenimientos (se rechaza en backend por seguridad)
            if (tipo === 'clase' || tipo === 'mantenimiento') {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado: Tu rol no permite la creación directa de clases o mantenimientos.'
                });
            }
        }
        else if (userRole === 'administrador') {
            // El administrador auto-aprueba todas sus reservas y salta bloqueos
            if (tipo === 'reserva') {
                req.body.estado_reserva = 'aprobada';
            }
        }

    } catch (error) {
        console.error("Error validando permisos en el middleware:", error);
        return res.status(500).json({ success: false, message: 'Error interno validando permisos.' });
    }

    // Si todas las validaciones pasan, continuar al siguiente middleware o controlador
    next();
};

module.exports = { validarActividades };