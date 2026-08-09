const estudianteDashboardService = require("../services/estudianteDashboard.service");

class EstudianteDashboardController {

    async getDashboard(req, res) {

        try {

            console.log("USUARIO RECIBIDO EN DASHBOARD:", req.usuario);

            if (!req.usuario || !req.usuario.id) {

                return res.status(401).json({
                    success: false,
                    message: "No se pudo identificar al usuario autenticado."
                });

            }

            const usuarioId = req.usuario.id;

            console.log("ID USADO PARA DASHBOARD:", usuarioId);

            const data = await estudianteDashboardService.getDashboard(usuarioId);

            return res.status(200).json(data);

        } catch (error) {

            console.error("ERROR DASHBOARD ESTUDIANTE:", error);

            return res.status(500).json({
                success: false,
                message: "Error cargando dashboard estudiante",
                error: error.message
            });

        }

    }

}

module.exports = new EstudianteDashboardController();