const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Ruta POST /api/auth/login
router.post('/login', authController.login);

// Rutas de Microsoft SSO
router.post('/microsoft', authController.loginMicrosoft);
router.post('/microsoft-register', authController.registerMicrosoft);

module.exports = router;
