const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verificarToken, verificarAdmin } = require('../middleware/autenticacion');  


router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Obtener el total de alertas
    const totalResult = await pool.query('SELECT COUNT(*) FROM alertas');
    const total = parseInt(totalResult.rows[0].count);
    const pages = Math.ceil(total / limit);

    // Obtener las alertas paginadas
    const result = await pool.query(
      'SELECT id, titulo, descripcion, tipo, estado, latitud, longitud FROM alertas LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    // Responder con data y paginacion
    res.json({
      data: result.rows,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        pages: pages
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Descartado por el momento
router.get('/filtro', async (req, res) => {
  try {

    const { tipo, radio, lat, lng } = req.query;

    if (!tipo || !radio || !lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing parameters: tipo, radio, lat, lng required' 
      });
    }

    const radioNum = parseFloat(radio);
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(radioNum) || isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ 
        error: 'Invalid number format for radio, lat, or lng' 
      });
    }


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

    
    const result = await pool.query(query, [tipo, latNum, lngNum, radioNum]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error filtering alerts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/stats', async (req, res) => {
  try {
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM alertas');
    const totalAlertas = parseInt(totalResult.rows[0].total);


    const activasResult = await pool.query("SELECT COUNT(*) as activas FROM alertas WHERE estado = 'activa'");
    const alertasActivas = parseInt(activasResult.rows[0].activas);


    const resueltasResult = await pool.query("SELECT COUNT(*) as resueltas FROM alertas WHERE estado = 'resuelta'");
    const alertasResueltas = parseInt(resueltasResult.rows[0].resueltas);


    const porTipoResult = await pool.query(`
      SELECT tipo, COUNT(*) as cantidad
      FROM alertas
      GROUP BY tipo
      ORDER BY cantidad DESC
    `);
    //no se utiliza
    const alertasPorTipo = {};
    porTipoResult.rows.forEach(row => {
      alertasPorTipo[row.tipo] = parseInt(row.cantidad);
    });


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


router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, titulo, descripcion, tipo, estado, latitud, longitud, fecha_creacion FROM alertas WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', verificarToken, async (req, res) => {
  const { titulo, descripcion, tipo, latitud, longitud, categoria_id } = req.body;
  const usuario_id = req.usuario.id;

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


router.put('/:id', async (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;
  
  try {
 
    if (!['activa', 'resuelta'].includes(estado)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    
    
    const result = await pool.query(
      'UPDATE alertas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' }); 
    }
    
    res.json(result.rows[0]); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.get('/stats', async (req, res) => {
  try {
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM alertas');
    const totalAlertas = parseInt(totalResult.rows[0].total);

    
    const activasResult = await pool.query("SELECT COUNT(*) as activas FROM alertas WHERE estado = 'activa'");
    const alertasActivas = parseInt(activasResult.rows[0].activas);

  
    const resueltasResult = await pool.query("SELECT COUNT(*) as resueltas FROM alertas WHERE estado = 'resuelta'");
    const alertasResueltas = parseInt(resueltasResult.rows[0].resueltas);

    
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


router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario.id;
  
  try {
    
    const alertaResult = await pool.query(
      'SELECT usuario_id FROM alertas WHERE id = $1',
      [id]
    );
    
    if (alertaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    

    if (alertaResult.rows[0].usuario_id !== usuario_id && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'You don\'t have permission to delete this alert' });
    }
    

    await pool.query('DELETE FROM alertas WHERE id = $1', [id]);
    
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;