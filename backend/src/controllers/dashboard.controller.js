const dashboardService = require("../services/dashboard.service");

class DashboardController {
    async getDashboard(req, res) {
        try {
            const data = {
                kpis:
                    await dashboardService.getKPIs(),
                reservas:
                    await dashboardService.getReservasSemana(),
                alertas:
                    await dashboardService.getAlertas(),
                agenda:
                    await dashboardService.getAgenda(),
                agendaSemana:
                    await dashboardService.getAgendaSemana()
            };
            return res.status(200).json(data);
        } catch (error) {
            console.error("==============================");
            console.error(
                "ERROR AL CARGAR DASHBOARD"
            );
            console.error(error);
            console.error("==============================");
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new DashboardController();