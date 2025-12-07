const express = require('express');
const router = express.Router();

const favoritesController = require('./favorites.controller');
const isAuth = require('../middleware/isAuth');

// Toggle crear/eliminar favorito
router.post(
  '/routes/:id/favorite',
  isAuth,
  favoritesController.toggleFavorite
);

// Eliminar favorito explícitamente
router.delete(
  '/routes/:id/favorite',
  isAuth,
  favoritesController.deleteFavorite
);

// Listar favoritos del usuario autenticado
router.get(
  '/me/favorites',
  isAuth,
  favoritesController.listMyFavorites
);

module.exports = router;
