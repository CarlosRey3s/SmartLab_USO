const express = require("express");

const router = express.Router();

const estudianteDashboardController =
require("../controllers/estudianteDashboard.controller");


// GET /api/estudiante/dashboard

router.get(
    "/",
    estudianteDashboardController.getDashboard
);


module.exports = router;