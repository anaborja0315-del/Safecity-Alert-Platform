const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { leer, escribir, siguienteId } = require('../store');
const { verificarToken } = require('../middleware/autenticacion');
const TablaHash = require('../estructuras/TablaHash');

const ARCHIVO = 'usuarios.json';

const usuarios = leer(ARCHIVO);
const tablaUsuarios = new TablaHash();
usuarios.forEach(u => tablaUsuarios.poner(u.email, u));

router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    if (tablaUsuarios.existe(email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = {
      id: siguienteId(usuarios),
      nombre,
      email,
      password_hash: passwordHash,
      rol: 'ciudadano'
    };

    usuarios.push(nuevoUsuario);
    escribir(ARCHIVO, usuarios);
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

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
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