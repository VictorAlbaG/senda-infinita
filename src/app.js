// 1. Cargar variables de entorno desde .env
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

// 2. Middlewares globales
// Permitir peticiones desde otros orígenes
app.use(cors());

// Permitir leer JSON en el body de las peticiones (req.body)
app.use(express.json());

// 3. Servir archivos estáticos desde /public
// __dirname aquí es /src, así que subimos un nivel (..) hasta la raíz y luego /public
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// 4. Ruta de prueba (health check) para comprobar que la API responde
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Senda Infinita API funcionando ✅',
  });
});

// 5. Aquí más adelante añadiremos:
// app.use('/api/auth', authRoutes);
// app.use('/api/routes', routesRoutes);
// etc.

module.exports = app;
