const jwt = require('jsonwebtoken');

// Middleware para verificar que la petición trae un JWT válido
const verificarToken = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: 'Acceso denegado. No se proporcionó un token de autenticación.' 
    });
  }

  try {
    // Si viene en formato "Bearer <token>", limpiamos el prefijo
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    const jwtSecret = process.env.JWT_SECRET || 'llave_secreta_temporal_muy_segura';
    const verificado = jwt.verify(token, jwtSecret);
    
    // Inyectamos el objeto con { id, rol } en la request
    req.usuario = verificado; 
    next(); 
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token no válido o expirado.' 
    });
  }
};

// Middleware opcional para restringir rutas a ciertos roles
const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Permisos insuficientes para realizar esta operación.' 
      });
    }
    next();
  };
};

module.exports = { verificarToken, verificarRol };
