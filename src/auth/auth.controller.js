const authService = require('./auth.service');

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'name, email y password son obligatorios',
      });
    }

    const result = await authService.registerUser({ name, email, password });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error en register:', error);

    if (error.code === 'EMAIL_IN_USE') {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    return res.status(500).json({ message: 'Error interno en el registro' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'email y password son obligatorios',
      });
    }

    const result = await authService.loginUser({ email, password });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en login:', error);

    if (error.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    return res.status(500).json({ message: 'Error interno en el login' });
  }
}

module.exports = {
  register,
  login,
};
