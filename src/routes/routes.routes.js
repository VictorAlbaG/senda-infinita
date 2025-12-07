const express = require('express');
const router = express.Router();
const routesController = require('./routes.controller');

const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');

// Lista de rutas con filtros y paginación
router.get('/', routesController.getRoutes);

// Detalle de una ruta por slug
router.get('/:slug', routesController.getRouteDetail);

// Importar una ruta desde ORS (solo ADMIN)
router.post('/import/ors', isAuth, isAdmin, routesController.importRouteFromORS);

module.exports = router;