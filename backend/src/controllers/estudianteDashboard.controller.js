const estudianteDashboardService =
require("../services/estudianteDashboard.service");


class EstudianteDashboardController {


    async getDashboard(req, res) {


        try {


            /*
            ==================================================
            TEMPORAL:
            Usuario de prueba mientras conectamos login
            ==================================================
            */

            const usuarioId = 1;



            const data =
            await estudianteDashboardService.getDashboard(
                usuarioId
            );



            res.status(200).json(data);



        } catch(error) {


            console.error(
                "Error dashboard estudiante:",
                error
            );



            res.status(500).json({

                message:
                "Error cargando dashboard estudiante"

            });


        }


    }


}



module.exports =
new EstudianteDashboardController();