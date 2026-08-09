const express = require('express');
const router = express.Router();

const {
    getDashboardEstudiante
} = require('../controllers/estudianteDashboard.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

// =====================================================
// DASHBOARD ESTUDIANTE
// =====================================================

router.get("/", verificarToken, getDashboardEstudiante);


module.exports = router;