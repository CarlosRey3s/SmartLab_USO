const authService = require('../services/auth.service');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Correo y contraseña son requeridos' });
    }

    // Validar en el servicio
    const user = await authService.login(email, password);

    // Generar Token
    const jwtSecret = process.env.JWT_SECRET || 'llave_secreta_temporal_muy_segura';
    const token = jwt.sign(
      { id: user.id, rol: user.rol }, 
      jwtSecret, 
      { expiresIn: '30m' }
    );

    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          nombres: user.nombre, // Mapeado para que el frontend no se rompa (espera nombres)
          apellidos: user.apellido,
          rol: user.rol,
          correo: user.correo
        }
      }
    });

  } catch (error) {
    console.error('Error en login:', error.message);
    // Si el error es lanzado por nuestro servicio ("Credenciales inválidas")
    if (error.message === 'Credenciales inválidas' || error.message === 'La cuenta del usuario está inactiva') {
      return res.status(401).json({ status: 'error', message: error.message });
    }
    // Otro error (BD caída, etc)
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al procesar el login' });
  }
};

module.exports = {
  login
};
