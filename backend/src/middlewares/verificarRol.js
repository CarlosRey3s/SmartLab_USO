const { pool } = require('../config/db');

// Middleware para restringir el acceso a ciertos endpoints según el rol
const verificarRol = (rolesPermitidos) => {
    return async (req, res, next) => {
        try {
            // Extraer el usuario_id (debería venir en los headers en un sistema con auth completo,
            // pero damos soporte a body o query como fallback). En desarrollo usamos '1' (administrador) si falta.
            const usuario_id = req.headers['usuario-id'] || (req.body && req.body.usuario_id) || (req.query && req.query.usuario_id) || '1'; 
            
            const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [usuario_id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado para validación de permisos.' });
            }

            const rolUsuario = result.rows[0].rol;
            
            if (!rolesPermitidos.includes(rolUsuario)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Acceso denegado. Tu rol (${rolUsuario}) no tiene permisos para realizar esta acción de modificación.` 
                });
            }

            next();
        } catch (error) {
            console.error('Error en middleware verificarRol:', error);
            res.status(500).json({ success: false, message: 'Error interno verificando rol del usuario.' });
        }
    };
};

module.exports = { verificarRol };
