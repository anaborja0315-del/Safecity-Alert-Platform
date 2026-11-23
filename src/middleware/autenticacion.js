const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decoded;

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const verificarAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.rol !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { verificarToken, verificarAdmin };