const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');
const adminController = require('./admin.controller');

router.use(isAuth, isAdmin);

router.get('/users', adminController.listUsers);
router.patch('/users/:id', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

router.get('/reviews', adminController.listReviews);
router.delete('/reviews/:id', adminController.deleteReview);

router.get('/routes', adminController.listRoutes);
router.patch('/routes/:id', adminController.updateRoute);
router.delete('/routes/:id', adminController.deleteRoute);

router.get('/photos', adminController.listPhotos);
router.delete('/photos/:id', adminController.deletePhoto);

module.exports = router;
