const docenteDashboardService =
    require("../services/docenteDashboard.service");

class DocenteDashboardController {
    async getDashboard(req, res) {
        try {
            // Se obtiene el ID del docente autenticado desde el JWT
            const docenteId = req.usuario.id;
            const data =
                await docenteDashboardService.getDashboard(
                    docenteId
                );
            res.status(200).json(data);
        } catch (error) {
            console.error(
                "Error dashboard docente:",
                error
            );
            res.status(500).json({
                message:
                    "Error cargando dashboard docente"
            });
        }
    }
}



module.exports = new DocenteDashboardController();