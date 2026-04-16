const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

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
router.post('/', async (req, res) => {
  const { titulo, descripcion, tipo, latitud, longitud, usuario_id, categoria_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO alertas (titulo, descripcion, tipo, latitud, longitud, usuario_id, categoria_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, titulo, descripcion, tipo, estado, latitud, longitud`,
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

// DELETE /api/alertas/:id - eliminar una alerta
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM alertas WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Alerta eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;