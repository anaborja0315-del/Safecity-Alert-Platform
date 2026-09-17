const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const alertasRoutes = require('./routes/alertas');
const usuariosRoutes = require('./routes/usuarios');

app.use('/api/alertas', alertasRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/api/hola', (req, res) => {
  res.json({ mensaje: 'SafeCity API funcionando ✓' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🛡️  SafeCity Server running at http://localhost:${PORT}`);
  console.log(`📍  Frontend: http://localhost:${PORT}`);
  console.log(`🔌  API: http://localhost:${PORT}/api`);
});