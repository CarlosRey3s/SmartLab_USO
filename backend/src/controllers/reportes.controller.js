const reportesService = require('../services/reportes.service');

const getUsoLaboratorios = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                status: 'error',
                message: 'Faltan parámetros startDate y endDate'
            });
        }

        const data = await reportesService.getUsoLaboratorios(startDate, endDate);
        
        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error en getUsoLaboratorios controller:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener estadísticas de uso de laboratorios'
        });
    }
};

const getReporteReservas = async (req, res) => {
    try {
        const { startDate, endDate, rol, laboratorio_id } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                status: 'error',
                message: 'Faltan parámetros startDate y endDate'
            });
        }

        const data = await reportesService.getReporteReservas(startDate, endDate, rol, laboratorio_id);

        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error en getReporteReservas controller:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener el reporte de reservas'
        });
    }
};

module.exports = {
    getUsoLaboratorios,
    getReporteReservas
};
