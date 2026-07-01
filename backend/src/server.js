const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const calendarioRoutes = require('./routes/calendario.routes');

// Montar rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/calendario', calendarioRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'success',
      message: 'API funcionando correctamente',
      db_time: result.rows[0].now
    });
  } catch (error) {
    console.error('Error al verificar la base de datos:', error);
    res.status(500).json({ status: 'error', message: 'Error conectando a la base de datos' });
  }
});

app.listen(port, async () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);

  // Probar la conexión a la base de datos al arrancar
  try {
    await db.query('SELECT 1');
    console.log('✅ Conexión a la base de datos exitosa.');
  } catch (err) {
    console.error('❌ Error al conectar con la base de datos:', err);
  }
});