const express = require('express');
const router = express.Router();
const routesController = require('./routes.controller');

// Lista de rutas con filtros y paginación
router.get('/', routesController.getRoutes);

// Detalle de una ruta por slug
router.get('/:slug', routesController.getRouteDetail);

module.exports = router;
