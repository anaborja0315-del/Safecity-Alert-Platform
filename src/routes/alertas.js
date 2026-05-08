const express = require('express');
const router = express.Router();// crea un mini servidor para manejar las rutas de alertas
const pool = require('../db/connection'); // conexión a la base de datos
const { verificarToken, verificarAdmin } = require('../middleware/autenticacion');

// GET /api/alertas - obtener todas las alertas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, titulo, descripcion, tipo, estado, latitud, longitud, fecha_creacion FROM alertas ORDER BY fecha_creacion DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alertas/:id - obtener una alerta por id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, titulo, descripcion, tipo, estado, latitud, longitud, fecha_creacion FROM alertas WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alertas - crear una alerta nueva
router.post('/', verificarToken, async (req, res) => {
  const { titulo, descripcion, tipo, latitud, longitud, categoria_id } = req.body;
  const usuario_id = req.usuario.id;  // Obtener del token JWT

  try {
    const result = await pool.query(
      `INSERT INTO alertas (titulo, descripcion, tipo, latitud, longitud, usuario_id, categoria_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, titulo, descripcion, tipo, estado, latitud, longitud, usuario_id`,
      [titulo, descripcion, tipo, latitud, longitud, usuario_id, categoria_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alertas/:id - actualizar estado de una alerta
router.put('/:id', async (req, res) => {
  const { estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE alertas SET estado = $1 WHERE id = $2 RETURNING id, titulo, estado',
      [estado, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Eliminar alerta
// Solo el dueño PUEDE eliminarla
// O un ADMIN puede eliminar cualquiera
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const usuarioID = req.usuario.id;
  const usuarioROL = req.usuario.rol;

  try {
    // Obtener la alerta para verificar quién la creó
    const result = await pool.query(
      'SELECT usuario_id FROM alertas WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alertaUsuarioID = result.rows[0].usuario_id;

    // Verificar: ¿eres el dueño o eres admin?
    if (usuarioID !== alertaUsuarioID && usuarioROL !== 'admin') {
      return res.status(403).json({ 
        error: 'You can only delete your own alerts. Admins can delete any alert.' 
      });
    }

    // Eliminar la alerta
    await pool.query('DELETE FROM alertas WHERE id = $1', [id]);
    res.json({ mensaje: 'Alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;