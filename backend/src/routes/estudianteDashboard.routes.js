const express = require("express");

const router = express.Router();

const estudianteDashboardController = require("../controllers/estudianteDashboard.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

router.get(
"/",
verificarToken,
estudianteDashboardController.getDashboard
);

module.exports = router;
