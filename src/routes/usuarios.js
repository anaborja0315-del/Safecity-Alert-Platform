const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { read, write, nextId } = require('../store');
const { verificarToken } = require('../middleware/autenticacion');
const TablaHash = require('../estructuras/TablaHash');

const FILE = 'usuarios.json';

// Indice de usuarios por email (TablaHash), cargado al iniciar el servidor.
const usuarios = read(FILE);
const tablaUsuarios = new TablaHash();
usuarios.forEach(u => tablaUsuarios.poner(u.email, u));

// POST /api/usuarios/register - registrar un usuario nuevo
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    // Rechazar emails duplicados usando la tabla hash
    if (tablaUsuarios.existe(email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = {
      id: nextId(usuarios),
      nombre,
      email,
      password_hash: passwordHash,
      rol: 'ciudadano'
    };

    usuarios.push(nuevoUsuario);
    write(FILE, usuarios);
    tablaUsuarios.poner(email, nuevoUsuario);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios/login - iniciar sesión
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar el usuario por email usando la tabla hash
    const usuario = tablaUsuarios.obtener(email);

    if (!usuario) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/:id - obtener un usuario por id
router.get('/:id', (req, res) => {
  try {
    const usuario = usuarios.find(u => String(u.id) === String(req.params.id));
    if (!usuario) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/perfil/me - obtener los datos del usuario autenticado
router.get('/perfil/me', verificarToken, (req, res) => {
  try {
    const usuario = usuarios.find(u => String(u.id) === String(req.usuario.id));
    if (!usuario) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;