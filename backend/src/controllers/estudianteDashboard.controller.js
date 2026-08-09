const { obtenerDashboardEstudiante } = require('../services/estudianteDashboard.service');

const getDashboardEstudiante = async (req, res) => {
    try {
        const usuarioId = req.user?.id || req.usuario?.id;
        const rol = req.user?.rol || req.usuario?.rol;

        console.log("=================================");
        console.log("DASHBOARD ESTUDIANTE");
        console.log("Usuario:", usuarioId);
        console.log("Rol:", rol);
        console.log("=================================");

        if (!usuarioId) {
            return res.status(401).json({
                mensaje: "Usuario no autenticado"
            });
        }

        const dashboard = await obtenerDashboardEstudiante(usuarioId, rol);

        console.log("RESPUESTA DASHBOARD:", JSON.stringify(dashboard, null, 2));

        return res.status(200).json(dashboard);

    } catch (error) {

        console.error("ERROR DASHBOARD ESTUDIANTE:", error);

        return res.status(500).json({
            mensaje: error.message || "Error al cargar el dashboard"
        });
    }
};

module.exports = {
    getDashboardEstudiante
};