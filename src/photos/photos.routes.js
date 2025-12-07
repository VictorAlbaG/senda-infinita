const express = require('express');
const router = express.Router();

const photosController = require('./photos.controller');
const isAuth = require('../middleware/isAuth');
const { upload } = require('../utils/upload');

// Subir foto a una ruta (requiere login)
router.post(
  '/routes/:id/photos',
  isAuth,
  upload.single('photo'),
  photosController.uploadRoutePhoto
);

// Listar fotos de una ruta (público)
router.get(
  '/routes/:id/photos',
  photosController.getRoutePhotos
);

module.exports = router;
