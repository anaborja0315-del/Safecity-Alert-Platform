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

// ===== FILTRAR ALERTAS POR TIPO Y ZONA =====
// GET /api/alertas/filtro?tipo=hueco&radio=5&lat=10.4236&lng=-75.5378
router.get('/filtro', async (req, res) => {
  try {
    // Recibir parámetros de la URL
    const { tipo, radio, lat, lng } = req.query;

    // Validar que todos los parámetros estén presentes
    if (!tipo || !radio || !lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing parameters: tipo, radio, lat, lng required' 
      });
    }

    // Convertir a números (seguridad)
    const radioNum = parseFloat(radio);
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    // Validar que sean números válidos
    if (isNaN(radioNum) || isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ 
        error: 'Invalid number format for radio, lat, or lng' 
      });
    }

    // Consulta SQL con PostGIS
    // ST_DWithin compara distancias geográficas
    // ST_MakePoint crea un vector (longitud, latitud)
    // radio * 1000 convierte km a metros
    const query = `
      SELECT 
        a.id,
        a.titulo,
        a.descripcion,
        a.tipo,
        a.estado,
        a.latitud,
        a.longitud,
        a.fecha_creacion,
        u.nombre as usuario_nombre,
        c.nombre as categoria_nombre
      FROM alertas a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN categorias c ON a.categoria_id = c.id
      WHERE a.tipo = $1
      AND ST_DWithin(
        ST_MakePoint(a.longitud, a.latitud)::geography,
        ST_MakePoint($3, $2)::geography,
        $4 * 1000
      )
      ORDER BY a.fecha_creacion DESC
    `;

    // Ejecutar consulta
    // $1 = tipo
    // $2 = latitud
    // $3 = longitud
    // $4 = radio (en km)
    const result = await pool.query(query, [tipo, latNum, lngNum, radioNum]);

    // Devolver alertas filtradas
    res.json(result.rows);

  } catch (error) {
    console.error('Error filtering alerts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// ===== OBTENER ESTADÍSTICAS =====
router.get('/stats', async (req, res) => {
  try {
    // Total de alertas
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM alertas');
    const totalAlertas = parseInt(totalResult.rows[0].total);

    // Alertas activas
    const activasResult = await pool.query("SELECT COUNT(*) as activas FROM alertas WHERE estado = 'activa'");
    const alertasActivas = parseInt(activasResult.rows[0].activas);

    // Alertas resueltas
    const resueltasResult = await pool.query("SELECT COUNT(*) as resueltas FROM alertas WHERE estado = 'resuelta'");
    const alertasResueltas = parseInt(resueltasResult.rows[0].resueltas);

    // Alertas por tipo
    const porTipoResult = await pool.query(`
      SELECT tipo, COUNT(*) as cantidad
      FROM alertas
      GROUP BY tipo
      ORDER BY cantidad DESC
    `);

    const alertasPorTipo = {};
    porTipoResult.rows.forEach(row => {
      alertasPorTipo[row.tipo] = parseInt(row.cantidad);
    });

    // Devolver estadísticas
    res.json({
      totalAlertas,
      alertasActivas,
      alertasResueltas,
      alertasPorTipo
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Server error' });
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

// PUT /api/alertas/:id - Cambiar estado
router.put('/:id', async (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;
  
  try {
    // Validar que sea "activa" o "resuelta"
    if (!['activa', 'resuelta'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    
    // Actualizar en BD
    const result = await pool.query(
      'UPDATE alertas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    
    res.json(result.rows[0]); // Devuelve alerta actualizada
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===== OBTENER ESTADÍSTICAS =====
router.get('/stats', async (req, res) => {
  try {
    // Total de alertas
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM alertas');
    const totalAlertas = parseInt(totalResult.rows[0].total);

    // Alertas activas
    const activasResult = await pool.query("SELECT COUNT(*) as activas FROM alertas WHERE estado = 'activa'");
    const alertasActivas = parseInt(activasResult.rows[0].activas);

    // Alertas resueltas
    const resueltasResult = await pool.query("SELECT COUNT(*) as resueltas FROM alertas WHERE estado = 'resuelta'");
    const alertasResueltas = parseInt(resueltasResult.rows[0].resueltas);

    // Alertas por tipo
    const porTipoResult = await pool.query(`
      SELECT tipo, COUNT(*) as cantidad
      FROM alertas
      GROUP BY tipo
      ORDER BY cantidad DESC
    `);

    const alertasPorTipo = {};
    porTipoResult.rows.forEach(row => {
      alertasPorTipo[row.tipo] = parseInt(row.cantidad);
    });

    // Devolver estadísticas
    res.json({
      totalAlertas,
      alertasActivas,
      alertasResueltas,
      alertasPorTipo
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// DELETE /api/alertas/:id - Eliminar una alerta
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario.id;
  
  try {
    // Verificar que sea el dueño o admin
    const alertaResult = await pool.query(
      'SELECT usuario_id FROM alertas WHERE id = $1',
      [id]
    );
    
    if (alertaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    
    // Solo el dueño o admin puede eliminar
    if (alertaResult.rows[0].usuario_id !== usuario_id && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso' });
    }
    
    // Eliminar
    await pool.query('DELETE FROM alertas WHERE id = $1', [id]);
    
    res.json({ message: 'Alerta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;