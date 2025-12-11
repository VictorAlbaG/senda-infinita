// Cargar variables de entorno desde .env
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./auth/auth.routes');
const isAuth = require('./middleware/isAuth');
const routesRoutes = require('./routes/routes.routes');
const favoritesRoutes = require('./favorites/favorites.routes');
const reviewsRoutes = require('./reviews/reviews.routes');
const photosRoutes = require('./photos/photos.routes');


const app = express();

// Middlewares globales
// Permitir peticiones desde otros orígenes
app.use(cors());

// Permitir leer JSON en el body de las peticiones (req.body)
app.use(express.json());

// Servir archivos estáticos desde /public
// __dirname aquí es /src, así que subimos un nivel (..) hasta la raíz y luego /public
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api', favoritesRoutes);
app.use('/api', reviewsRoutes);
app.use('/api', photosRoutes);

// Servir archivos estáticos de /uploads
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Ruta protegida de prueba
app.get('/api/me', isAuth, (req, res) => {
  res.json({
    message: 'Usuario autenticado correctamente',
    user: req.user,
  });
});

// Ruta de prueba (health check) para comprobar que la API responde
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Senda Infinita API funcionando ✅',
  });
});

module.exports = app;
