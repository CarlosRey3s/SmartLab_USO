const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { pool: db } = require('./config/db');
console.log('DEBUG - tipo de db:', typeof db, '- tiene query?', typeof db.query);
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Servir la carpeta de uploads de manera estática
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const calendarioRoutes = require('./routes/calendario.routes');
const laboratorioRoutes = require('./routes/laboratorio.routes');

// 1. Importamos los nuevos routers
const actividadesRoutes = require('./routes/actividadesRoutes');
const sugerenciasRoutes = require('./routes/sugerencia.routes');
const reportesRoutes = require('./routes/reportes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const estudianteDashboardRoutes = require("./routes/estudianteDashboard.routes");


// Montar rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/laboratorios', laboratorioRoutes);
app.use('/api/actividades', actividadesRoutes); // 2. Montamos las nuevas rutas
app.use('/api/sugerencias', sugerenciasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/estudiante/dashboard',estudianteDashboardRoutes); // 3. Montamos las rutas del dashboard del estudiante

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