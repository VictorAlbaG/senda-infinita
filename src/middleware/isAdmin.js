/**
 * Middleware para asegurar que el usuario tiene rol ADMIN.
 * Asume que isAuth ya ha metido req.user = { id, role }.
 */
function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Requiere rol ADMIN' });
  }

  return next();
}

module.exports = isAdmin;
