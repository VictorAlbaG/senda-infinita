const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.warn('JWT_SECRET no está definido en .env. Define uno seguro.');
}

/**
 * Genera un token JWT para un usuario.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/**
 * Registra un nuevo usuario.
 * - Verifica que el email no esté en uso.
 * - Hashea la contraseña.
 * - Crea el usuario en la base de datos.
 * - Devuelve el usuario (sin password) + token.
 */
async function registerUser({ name, email, password }) {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    const error = new Error('El email ya está en uso');
    error.code = 'EMAIL_IN_USE';
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      // role: 'USER' se pone por defecto en el schema
    },
  });

  const token = generateToken(user);

  // No devolvemos el password
  const userSafe = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return {
    user: userSafe,
    token,
  };
}

/**
 * Login de usuario.
 * - Busca por email.
 * - Compara la contraseña.
 * - Devuelve usuario (sin password) + token.
 */
async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const error = new Error('Credenciales inválidas');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    const error = new Error('Credenciales inválidas');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = generateToken(user);

  const userSafe = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return {
    user: userSafe,
    token,
  };
}

module.exports = {
  registerUser,
  loginUser,
};
