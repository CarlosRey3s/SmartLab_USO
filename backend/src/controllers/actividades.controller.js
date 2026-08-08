const actividadesService = require('../services/actividades.service');



const crearActividad = async (req, res) => {
    try {
        // 1. Extraer el usuario que viene del middleware 'verificarToken'
        // Si no viniera (ej. en pruebas sin token), dejamos un fallback temporal para no romper nada
        const usuarioLogueado = req.usuario || {
            id: req.body.usuario_id || 1,
            rol: req.body.rol || 'estudiante'
        };

        const datosModal = req.body;

        // 2. Llamamos al servicio enviando los datos y el objeto del usuario
        const nuevaActividad = await actividadesService.programarActividad(datosModal, usuarioLogueado);

        res.status(201).json({
            success: true,
            message: nuevaActividad.mensaje,
            data: nuevaActividad
        });

    } catch (error) {
        console.error('Error al crear la actividad:', error);
        const statusCode = error.message.includes('ocupado') ? 400 : 500;

        res.status(statusCode).json({
            success: false,
            message: 'Error al procesar la actividad',
            error: error.message
        });
    }
};

const actualizarActividad = async (req, res) => {
    try {

        const idactividad = req.params.id; // extraer el id de la URL
        const datosModal = req.body; // extraer los datos del cuerpo de la solicitud
        const idAdminLogueado = datosModal.usuario_id || "1"; // Cambiar cuando se tenga el middleware de autenticación implementado

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

};

// Añade esta función:
const consultarDisponibilidad = async (req, res) => {
    try {
        const { laboratorio_id, fecha, hora_inicio, hora_fin, exclude_id } = req.query;
        if (!laboratorio_id || !fecha || !hora_inicio || !hora_fin) {
            return res.status(400).json({ exito: false, mensaje: 'Faltan parámetros de tiempo o laboratorio' });
        }

        const inicioDatetime = new Date(`${fecha}T${hora_inicio}`);
        const finDatetime = new Date(`${fecha}T${hora_fin}`);

        // Importante: Asegurar que actividadesService.obtenerDisponibilidad existe, o usar la ruta correcta
        const disponibilidad = await actividadesService.obtenerDisponibilidad(
            laboratorio_id, inicioDatetime, finDatetime, exclude_id
        );
        res.status(200).json({ exito: true, data: disponibilidad });
    } catch (error) {
        console.log('ERROR en consultarDisponibilidad:', error.message);
        console.log('STACK:', error.stack);
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

// Función UNIFICADA para leer las actividades (Estructura completa + Expansión RRule)
const obtenerActividades = async (req, res) => {
    try {
        // 1. React Big Calendar nos mandará el rango de fechas que está viendo el usuario
        const { start, end } = req.query;

        // NUEVO: Extraemos el ID y el rol del usuario desde el token JWT
        // (Tu middleware de autenticación debería estar inyectando 'req.usuario' o 'req.user')
        const usuarioId = req.usuario.id;
        const rol = req.usuario.rol;



        // 🚀 AGREGA ESTA LÍNEA AQUÍ:
        console.log("=== DEBUG SEGURIDAD ===");
        console.log("ID del usuario:", usuarioId);
        console.log("Rol detectado:", rol);
        console.log("=======================");

        // 2. Validamos que el frontend sí nos esté mandando ese rango
        if (!start || !end) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros: Se requieren las fechas start y end para la vista actual del calendario.'
            });
        }

        // 3. Delegamos el trabajo a nuestra nueva súper función del servicio
        // NUEVO: Ahora pasamos los 4 parámetros (fechas + credenciales de privacidad)
        const actividadesExpandidas = await actividadesService.obtenerActividadesExpandidas(start, end, usuarioId, rol);

        // 4. Devolvemos el arreglo listo para que React lo dibuje y lea los modales
        res.status(200).json({
            success: true,
            data: actividadesExpandidas
        });

    } catch (error) {
        console.error('Error al obtener el calendario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno al cargar el calendario',
            error: error.message
        });
    }
};


// Controlador para obtener TODAS las solicitudes con filtro de seguridad (RBAC) + Paginación
const obtenerTodas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const rol = req.usuario.rol;
        const { estado, page = 1, limit = 10 } = req.query;

        const resultado = await actividadesService.obtenerTodasSolicitudes(
            usuarioId, rol, estado || null, parseInt(page, 10), parseInt(limit, 10)
        );

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener todas las solicitudes:', error);
        res.status(500).json({ message: 'Error interno al cargar las solicitudes' });
    }
};

// Controlador para Aprobar o Rechazar
const resolverSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { accion, motivo_resolucion } = req.body; // 'aprobar' o 'rechazar'
        const resolutorId = req.usuario.id;

        if (!accion || !['aprobar', 'rechazar'].includes(accion)) {
            return res.status(400).json({ success: false, message: 'Debe especificar una accion válida (aprobar o rechazar)' });
        }

        const resultado = await actividadesService.resolverSolicitud(id, accion, resolutorId, motivo_resolucion);
        res.status(200).json({ success: true, message: resultado.message });
    } catch (error) {
        console.error('Error al resolver la solicitud:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
    }
};

const entregarEquipos = async (req, res) => {
    try {
        const { id } = req.params; // actividad_id
        const usuarioId = req.usuario.id;
        const resultado = await actividadesService.registrarEntregaEquipos(id, usuarioId);
        res.status(200).json({ success: true, message: resultado.mensaje });
    } catch (error) {
        console.error('Error al entregar equipos:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const devolverEquipos = async (req, res) => {
    try {
        const { id } = req.params; // actividad_id
        const { reporteDano } = req.body;
        const resolutorId = req.usuario.id;

        const resultado = await actividadesService.registrarDevolucionEquipos(id, reporteDano, resolutorId);
        res.status(200).json({ success: true, message: resultado.mensaje });
    } catch (error) {
        console.error('Error al devolver equipos:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Controlador para que el solicitante cancele su propia reserva pendiente
const cancelarReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const resultado = await actividadesService.cancelarSolicitud(id, usuarioId);
        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al cancelar la solicitud:', error);
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al cancelar la solicitud.' });
    }
};

// Controlador para reprogramar una solicitud incompleta (solo admin/coordinador)
const reprogramarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha, hora_inicio, hora_fin } = req.body;

        if (!fecha || !hora_inicio || !hora_fin) {
            return res.status(400).json({ success: false, message: 'Se requieren fecha, hora_inicio y hora_fin.' });
        }

        const resultado = await actividadesService.reprogramarSolicitud(id, fecha, hora_inicio, hora_fin);
        res.status(200).json({ success: true, message: resultado.message, nuevoId: resultado.nuevoId });
    } catch (error) {
        console.error('Error al reprogramar la solicitud:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
    }
};

const marcarAusente = async (req, res) => {
    try {
        const { id } = req.params; // actividad_id
        const resolutorId = req.usuario.id;
        const resultado = await actividadesService.marcarAusente(id, resolutorId);
        res.status(200).json({ success: true, message: resultado.mensaje });
    } catch (error) {
        console.error('Error al marcar inasistencia:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
    }
};

// Exportar controladores:
module.exports = {
    crearActividad,
    actualizarActividad,
    eliminarActividad,
    obtenerActividades,
    consultarDisponibilidad,
    obtenerTodas,
    resolverSolicitud,
    cancelarReserva,
    entregarEquipos,
    devolverEquipos,
    reprogramarSolicitud,
    marcarAusente
};
