const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('JWT_SECRET no está definido en .env. El middleware isAuth fallará.');
}

/**
 * Middleware que verifica el token JWT.
 * - Espera un header: Authorization: Bearer <token>
 * - Si es válido, añade req.user = { id, role }
 * - Si no, responde 401
 */
function isAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: payload.id,
      role: payload.role,
    };

    return next();
  } catch (error) {
    console.error('Error en isAuth:', error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

module.exports = isAuth;
