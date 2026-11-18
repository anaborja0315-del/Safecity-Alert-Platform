const express = require('express');
const router = express.Router();
const { read, write, nextId } = require('../store');
const { verificarToken } = require('../middleware/autenticacion');
const Pila = require('../estructuras/Pila');
const Cola = require('../estructuras/Cola');

const FILE = 'alertas.json';
const LIMIT = 10;

// Pila de alertas borradas para "Undo delete" (limite 10).
const pilaEliminadas = new Pila(10);
// Cola de alertas pendientes de revision por el admin (no persistente).
const colaPendientes = new Cola();

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/alertas - listado paginado
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const alertas = read(FILE);
    const ordenadas = [...alertas].sort((a, b) => (b.id || 0) - (a.id || 0));
    const total = ordenadas.length;
    const pages = Math.ceil(total / LIMIT) || 1;
    const offset = (page - 1) * LIMIT;
    const data = ordenadas.slice(offset, offset + LIMIT);

    res.json({
      data,
      pagination: {
        page,
        limit: LIMIT,
        total,
        pages
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alertas/filtro - filtrar por tipo y radio (Haversine)
router.get('/filtro', (req, res) => {
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

    const alertas = read(FILE);
    const resultado = alertas.filter(a => {
      if (a.tipo !== tipo) return false;
      const dist = haversineKm(latNum, lngNum, parseFloat(a.latitud), parseFloat(a.longitud));
      return dist <= radioNum;
    });

    res.json(resultado);
  } catch (err) {
    console.error('Error filtering alerts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/alertas/stats - estadísticas
router.get('/stats', (req, res) => {
  try {
    const alertas = read(FILE);
    const totalAlertas = alertas.length;
    const alertasActivas = alertas.filter(a => a.estado === 'activa').length;
    const alertasResueltas = alertas.filter(a => a.estado === 'resuelta').length;

    const alertasPorTipo = {};
    alertas.forEach(a => {
      alertasPorTipo[a.tipo] = (alertasPorTipo[a.tipo] || 0) + 1;
    });

    res.json({
      totalAlertas,
      alertasActivas,
      alertasResueltas,
      alertasPorTipo
    });
  } catch (err) {
    console.error('Error getting stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/alertas/pendientes - cola de revision (solo admin)
router.get('/pendientes', verificarToken, (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({
    data: colaPendientes.aArray(),
    total: colaPendientes.tamanio()
  });
});

// POST /api/alertas/pendientes/siguiente - revisar siguiente (solo admin)
router.post('/pendientes/siguiente', verificarToken, (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const alerta = colaPendientes.desencolar();
  if (!alerta) {
    return res.status(404).json({ error: 'No pending alerts' });
  }
  res.json(alerta);
});

// POST /api/alertas/deshacer - restaurar ultima alerta borrada
router.post('/deshacer', verificarToken, (req, res) => {
  const elemento = pilaEliminadas.cima();
  if (!elemento) {
    return res.status(404).json({ error: 'Nothing to undo' });
  }
  // Verificar permisos: admin o quien la borro
  if (elemento.borradoPor !== req.usuario.id && req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'You do not have permission to undo this deletion' });
  }

  const restaurada = pilaEliminadas.desapilar();
  const alerta = restaurada.alerta;

  const alertas = read(FILE);
  // Evitar duplicados si ya existe
  if (!alertas.find(a => String(a.id) === String(alerta.id))) {
    alertas.push(alerta);
    write(FILE, alertas);
  }

  res.json(alerta);
});

// GET /api/alertas/:id - obtener una alerta por id
router.get('/:id', (req, res) => {
  try {
    const alertas = read(FILE);
    const alerta = alertas.find(a => String(a.id) === String(req.params.id));
    if (!alerta) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(alerta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alertas - crear alerta (requiere token)
router.post('/', verificarToken, (req, res) => {
  const { titulo, descripcion, tipo, latitud, longitud, categoria_id } = req.body;
  const usuario_id = req.usuario.id;

  try {
    const alertas = read(FILE);
    const nueva = {
      id: nextId(alertas),
      titulo,
      descripcion,
      tipo,
      estado: 'activa',
      latitud,
      longitud,
      usuario_id,
      categoria_id: categoria_id !== undefined ? categoria_id : null,
      fecha_creacion: new Date().toISOString()
    };
    alertas.push(nueva);
    write(FILE, alertas);

    // Encolar en la cola de revision
    colaPendientes.encolar(nueva);

    res.status(201).json(nueva);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alertas/:id - actualizar estado (solo admin)
router.put('/:id', verificarToken, (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;

  try {
    if (!['activa', 'resuelta'].includes(estado)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const alertas = read(FILE);
    const idx = alertas.findIndex(a => String(a.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    alertas[idx].estado = estado;
    write(FILE, alertas);
    res.json(alertas[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/alertas/:id - eliminar (dueño o admin)
router.delete('/:id', verificarToken, (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario.id;

  try {
    const alertas = read(FILE);
    const alerta = alertas.find(a => String(a.id) === String(id));
    if (!alerta) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (String(alerta.usuario_id) !== String(usuario_id) && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: "You don't have permission to delete this alert" });
    }

    // Apilar la alerta completa antes de borrar (guarda quien la borro)
    pilaEliminadas.apilar({ alerta, borradoPor: usuario_id });

    const nuevas = alertas.filter(a => String(a.id) !== String(id));
    write(FILE, nuevas);
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;