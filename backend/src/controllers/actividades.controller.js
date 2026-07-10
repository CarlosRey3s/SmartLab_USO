const actividadesService = require('../services/actividades.service');

const crearActividad = async (req, res) => {
    try {
        // 1. Extraer el ID del usuario logueado AQUÍ ADENTRO, donde 'req' sí existe.
        // (Esto asume que ya pasaste por un middleware que validó el token JWT)
        //const idAdminLogueado = req.usuario.id;
        //Cambiarlo cuando se tenga el middleware de autenticación implementado. Por ahora, lo dejamos hardcodeado para pruebas.
        // Y tambien cuando se trabaje con el login de usuatio y la interfaz.
        const idAdminLogueado = "1";

        console.log("ID del usuario logueado en el controlador:", idAdminLogueado);
        // o si viene del request:
        console.log("Usuario en el req:", req.user);

        // 2. Extraer la información que viene del modal de React
        const datosModal = req.body;

        // 3. Llamaremos al servicio para que procese la información y guarde
        const nuevaActividad = await actividadesService.programarActividad(datosModal, idAdminLogueado);

        // 4. Responder al frontend que todo salió bien 
        res.status(201).json({
            success: true,
            message: 'Actividad programada exitosamente',
            data: nuevaActividad // Devolvemos el resultado del servicio
        });

    } catch (error) {
        console.error('Error al crear la actividad:', error);

        // Dependiendo del error, podrías mandar un 400 (Bad Request) o 500 (Server Error)
        // Por ahora dejamos 500 o 400 dependiendo si es un error de choque de horarios
        const statusCode = error.message.includes('ocupado') ? 400 : 500;

        res.status(statusCode).json({
            success: false,
            message: 'Error al procesar la actividad',
            error: error.message
        });
    }
};

// Función para leer las actividades
const obtenerTodasLasActividades = async (req, res) => {
    try {
        // AQUÍ ESTABA EL ERROR: Asegúrate de que diga actividadesService (sin 's' al final)
        const actividades = await actividadesService.obtenerActividades();

        res.status(200).json({
            success: true,
            data: actividades
        });
    } catch (error) {
        console.error('Error al obtener las actividades:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las actividades',
            error: error.message
        });
    }
};

const actualizarActividad = async (req, res) => {
    try {

        const idactividad = req.params.id; // extraer el id de la URL
        const idAdminLogueado = "1"; // Cambiar cuando se tenga el middleware de autenticación implementado
        const datosModal = req.body; // extraer los datos del cuerpo de la solicitud

        // Llamar al servicio para actualizar la actividad
        const resultado = await actividadesService.actualizarActividad(idactividad, datosModal, idAdminLogueado);

        res.status(200).json({
            success: true,
            message: 'Actividad actualizada exitosamente',
            data: resultado // Devolvemos el resultado del servicio
        });

    } catch (error) {
        console.error('Error al actualizar la actividad:', error);
        const statusCode = error.message.includes('ocupado') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: 'Error al actualizar la actividad',
            error: error.message
        });
    }
}

const eliminarActividad = async (req, res) => {
    try {
        const idactividad = req.params.id; // extraer el id de la URL
        const resultado = await actividadesService.eliminarActividad(idactividad);

        res.status(200).json({
            success: true,
            message: 'Actividad eliminada exitosamente',
            data: resultado
        });
    } catch (error) {
        console.error('Error al eliminar la actividad:', error);
        // si el error es porque no existi, mandamos un 404, sino un 500
        const statusCode = error.message.includes('no existe') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: 'Error al eliminar la actividad',
            error: error.message
        });

    };
}
// Exportamos el controlador
module.exports = { crearActividad, obtenerTodasLasActividades, actualizarActividad, eliminarActividad };