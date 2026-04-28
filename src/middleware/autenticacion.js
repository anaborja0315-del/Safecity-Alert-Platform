const jwt = require('jsonwebtoken');

// Middleware que verifica si el usuario está autenticado
const verificarToken = (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guardar los datos del usuario en req.usuario para usarlos después
    req.usuario = decoded;

    // Pasar al siguiente middleware o endpoint
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verificarToken;