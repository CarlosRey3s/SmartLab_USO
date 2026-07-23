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

const loginMicrosoft = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ status: 'error', message: 'Falta el accessToken de Microsoft' });
    }

    const result = await authService.loginMicrosoft(accessToken);
    
    // Si el usuario es nuevo, el servicio devuelve 'incomplete_profile'
    if (result.status === 'incomplete_profile') {
      return res.status(404).json(result);
    }

    const { user } = result;

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
          nombres: user.nombre,
          apellidos: user.apellido,
          rol: user.rol,
          correo: user.correo
        }
      }
    });
  } catch (error) {
    console.error('Error en login con Microsoft:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al procesar el login con Microsoft' });
  }
};

const registerMicrosoft = async (req, res) => {
  try {
    const { accessToken, expediente, rol } = req.body;
    if (!accessToken || !expediente || !rol) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos requeridos (accessToken, expediente, rol)' });
    }

    const user = await authService.registerMicrosoft(accessToken, expediente, rol);

    const jwtSecret = process.env.JWT_SECRET || 'llave_secreta_temporal_muy_segura';
    const token = jwt.sign(
      { id: user.id, rol: user.rol }, 
      jwtSecret, 
      { expiresIn: '30m' }
    );

    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          nombres: user.nombre,
          apellidos: user.apellido,
          rol: user.rol,
          correo: user.correo
        }
      }
    });
  } catch (error) {
    console.error('Error en registro con Microsoft:', error.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor al registrar con Microsoft' });
  }
};

module.exports = {
  login,
  loginMicrosoft,
  registerMicrosoft
};
