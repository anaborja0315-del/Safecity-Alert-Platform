const express = require('express'); // 
const path = require('path'); //
require('dotenv').config(); // Cargar variables de entorno desde .env

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const app = express();

// Permitir que el servidor reciba JSON
app.use(express.json());
app.use(limiter);

// Servir archivos estáticos del frontend (carpeta public)
app.use(express.static(path.join(__dirname, 'public')));

// Importar rutas de la API
const alertasRoutes = require('./routes/alertas');
const usuariosRoutes = require('./routes/usuarios');

// Configurar rutas de la API
app.use('/api/alertas', alertasRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Ruta de prueba para verificar que la API funciona
app.get('/api/hola', (req, res) => {
  res.json({ mensaje: 'SafeCity API funcionando ✓' });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🛡️  SafeCity Server running at http://localhost:${PORT}`);
  console.log(`📍  Frontend: http://localhost:${PORT}`);
  console.log(`🔌  API: http://localhost:${PORT}/api`);
});