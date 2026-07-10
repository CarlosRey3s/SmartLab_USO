const validarActividades = (req, res, next) => {
    const { tipo, laboratorio, fecha, desde, hasta } = req.body;

    // 1. Corregido: cambiamos 're' por 'res' para que coincida con el frontend
    const tiposValidos = ['clase', 'mantenimiento', 'reserva']; // Corregido: 'res' por 'reserva'
    if (!tipo || !tiposValidos.includes(tipo)) {
        return res.status(400).json({
            success: false,
            message: 'Tipo de actividad inválido. Debe ser "clase", "mantenimiento" o "reserva".'
        });
    }

    // Validacion de campos compartidos (obligatorios para los 3 tipos)
    if (!laboratorio || !fecha || !desde || !hasta) {
        return res.status(400).json({
            success: false,
            message: 'Faltan campos obligatorios. Laboratorio, fecha, desde y hasta son requeridos.'
        });
    }

    // Validar especificas segun el tipo que seleccione el usuario
    if (tipo === 'clase') {
        const { materia, docente, numPersonas } = req.body;
        if (!materia || !docente || !numPersonas) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios para clase. Materia, docente y numPersonas son requeridos.'
            });
        }
    } else if (tipo === 'mantenimiento') {
        const { responsable } = req.body;
        if (!responsable) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios para mantenimiento. Responsable es requerido.'
            });
        }
    }
    else if (tipo === 'reserva') { // Corregido: 'res' por 'reserva'
        // 2. Corregido: cambiamos 'numeroPersonas' por 'numPersonas'
        const { titulo, numPersonas } = req.body;
        if (!titulo || !numPersonas) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios para reserva. Titulo y numPersonas son requeridos.'
            });
        }
    }

    // Si todas las validaciones pasan, continuar al siguiente middleware o controlador
    next();
};

module.exports = { validarActividades };