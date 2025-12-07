const express = require('express');
const router = express.Router();

const reviewsController = require('./reviews.controller');
const isAuth = require('../middleware/isAuth');

// Crear review (requiere login)
router.post(
  '/routes/:id/reviews',
  isAuth,
  reviewsController.createReview
);

// Listar reviews de una ruta (público)
router.get(
  '/routes/:id/reviews',
  reviewsController.getRouteReviews
);

module.exports = router;
