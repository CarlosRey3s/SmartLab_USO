// Importamos la clase Pool del paquete pg y dotenv para las variables de entorno
const { Pool } = require('pg');
require('dotenv').config();

// Configuramos la conexión leyendo nuestro archivo .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Evento para verificar que la conexión fue exitosa al arrancar
pool.on('connect', () => {
    console.log('✅ Conexión establecida con éxito a PostgreSQL (smartlabs_db)');
});

// Evento para capturar errores inesperados y que el servidor no se caiga
pool.on('error', (err) => {
    console.error('❌ Error inesperado en el cliente de PostgreSQL:', err.message);
    process.exit(-1);
});

// Exportamos el pool para poder usarlo en nuestros controladores y modelos
module.exports = pool;