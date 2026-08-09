const express = require('express');

const router = express.Router();

const {
    getDashboardEstudiante
} = require('../controllers/estudianteDashboard.controller');


// =====================================================
// DASHBOARD ESTUDIANTE
// =====================================================

router.get(
    '/',
    getDashboardEstudiante
);


module.exports = router;