const dashboardService = require("../services/dashboard.service");


class DashboardController {


    async getDashboard(req,res){


        try{


            const data = {


                kpis:
                await dashboardService.getKPIs(),


                reservas:
                await dashboardService.getReservasSemana(),


                alertas:
                await dashboardService.getAlertas(),


                saturacion:
                await dashboardService.getSaturacion(),


                agenda:
                await dashboardService.getAgenda()


            };



            res.json(data);



        }catch(error){


            console.error(
                "Error dashboard:",
                error
            );


            res.status(500).json({

                message:"Error cargando dashboard"

            });


        }


    }


}



module.exports = new DashboardController();