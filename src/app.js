const express = require('express');
require('dotenv').config();

const app = express();

app.use(express.json());

const alertasRoutes = require('./routes/alertas');
app.use('/api/alertas', alertasRoutes);

app.get('/hola', (req, res) => {
  res.json({ mensaje: 'SafeCity API funcionando ✓' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});