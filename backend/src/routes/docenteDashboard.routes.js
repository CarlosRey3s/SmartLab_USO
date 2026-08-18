const express = require("express");

const router = express.Router();


const controller = require("../controllers/docenteDashboard.controller");
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get("/", verificarToken, verificarRol(['docente', 'administrador', 'coordinador']), controller.getDashboard);



module.exports = router;