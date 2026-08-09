import {
    useEffect,
    useState
} from "react";

import "../../css/evaluaciones.css";

import {
    obtenerDashboardEstudiante
} from "../../services/estudianteDashboard.service";

import type {
    EstudianteDashboard,
    ReservaEstudiante
} from "../../types/estudianteDashboard.types";

export default function Dashboard() {

    const [
        dashboard,
        setDashboard
    ] = useState<EstudianteDashboard | null>(null);

    const [
        cargando,
        setCargando
    ] = useState(true);


    // =====================================================
    // CARGAR DASHBOARD
    // =====================================================

    useEffect(() => {

        cargarDashboard();

    }, []);


    const cargarDashboard = async () => {

        try {

            setCargando(true);

            const data =
                await obtenerDashboardEstudiante();

            setDashboard(data);

        } catch (error) {

            console.error(
                "Error cargando dashboard del estudiante:",
                error
            );

        } finally {

            setCargando(false);

        }

    };


    // =====================================================
    // FORMATEAR FECHA
    // =====================================================

    const obtenerFecha = (
        fecha: string
    ) => {

        if (!fecha) {

            return {
                dia: "--",
                mes: "---",
                anio: "----"
            };

        }

        const fechaPartes =
            fecha.split(" ")[0].split("-");

        if (fechaPartes.length !== 3) {

            return {
                dia: "--",
                mes: "---",
                anio: "----"
            };

        }

        const meses = [
            "ENE",
            "FEB",
            "MAR",
            "ABR",
            "MAY",
            "JUN",
            "JUL",
            "AGO",
            "SEP",
            "OCT",
            "NOV",
            "DIC"
        ];

        const mesNumero =
            Number(fechaPartes[1]);

        return {

            dia: fechaPartes[2],

            mes:
                meses[mesNumero - 1] ?? "---",

            anio:
                fechaPartes[0]

        };

    };


    // =====================================================
    // ESTADO
    // =====================================================

    const obtenerTextoEstado = (
        estado: string
    ) => {

        switch (estado) {

            case "pendiente":
                return "Pendiente";

            case "aprobada":
                return "Aprobada";

            case "cancelada":
                return "Cancelada";

            case "completada":
                return "Completada";

            case "rechazada":
                return "Rechazada";

            default:
                return estado;

        }

    };


    const obtenerClaseEstado = (
        estado: string
    ) => {

        switch (estado) {

            case "aprobada":
                return "dashboard-status-approved";

            case "pendiente":
                return "dashboard-status-pending";

            case "cancelada":
                return "dashboard-status-cancelled";

            case "completada":
                return "dashboard-status-completed";

            case "rechazada":
                return "dashboard-status-rejected";

            default:
                return "";

        }

    };


    // =====================================================
    // CARGANDO
    // =====================================================

    if (cargando) {

        return (

            <div className="student-dashboard">

                <div className="student-dashboard-loading">

                    <div className="loading-icon">
                        ⏳
                    </div>

                    <h2>
                        Cargando dashboard...
                    </h2>

                    <p>
                        Estamos preparando tu información.
                    </p>

                </div>

            </div>

        );

    }


    // =====================================================
    // ERROR
    // =====================================================

    if (!dashboard) {

        return (

            <div className="student-dashboard">

                <div className="student-dashboard-empty">

                    <div className="empty-icon">
                        ⚠️
                    </div>

                    <h2>
                        No se pudo cargar la información
                    </h2>

                    <p>
                        Intenta actualizar la página.
                    </p>

                </div>

            </div>

        );

    }


    // =====================================================
    // RESERVAS
    // =====================================================

    const reservas =
        dashboard.reservas ?? [];


    const reservasPendientes =
        reservas.filter(
            reserva =>
                reserva.estado_reserva === "pendiente"
        ).length;


    const reservasAprobadas =
        reservas.filter(
            reserva =>
                reserva.estado_reserva === "aprobada"
        ).length;


    // =====================================================
    // DASHBOARD
    // =====================================================

    return (

        <div className="student-dashboard">


            {/* ==================================================
                ENCABEZADO
            ================================================== */}

            <div className="student-dashboard-header">

                <div>

                    <span className="dashboard-eyebrow">
                        PANEL DEL ESTUDIANTE
                    </span>

                    <h1 className="section-main-title">
                        Mi Dashboard
                    </h1>

                    <p className="dashboard-description">
                        Consulta el estado de tus reservas y
                        próximos espacios.
                    </p>

                </div>

            </div>


            {/* ==================================================
                RESUMEN
            ================================================== */}

            <div className="student-dashboard-summary">


                <div className="dashboard-summary-card">

                    <div className="summary-card-icon">
                        📅
                    </div>

                    <div>

                        <span className="summary-card-label">
                            Total de reservas
                        </span>

                        <strong className="summary-card-number">
                            {reservas.length}
                        </strong>

                    </div>

                </div>


                <div className="dashboard-summary-card">

                    <div className="summary-card-icon">
                        ⏳
                    </div>

                    <div>

                        <span className="summary-card-label">
                            Pendientes
                        </span>

                        <strong className="summary-card-number">
                            {reservasPendientes}
                        </strong>

                    </div>

                </div>


                <div className="dashboard-summary-card">

                    <div className="summary-card-icon">
                        ✓
                    </div>

                    <div>

                        <span className="summary-card-label">
                            Aprobadas
                        </span>

                        <strong className="summary-card-number">
                            {reservasAprobadas}
                        </strong>

                    </div>

                </div>

            </div>


            {/* ==================================================
                CONTENIDO PRINCIPAL
            ================================================== */}

            <div className="student-dashboard-content">


                {/* ==================================================
                    RESERVAS
                ================================================== */}

                <section className="dashboard-reservations-panel">


                    <div className="dashboard-panel-header">

                        <div>

                            <span className="dashboard-panel-eyebrow">
                                ACTIVIDAD
                            </span>

                            <h2>
                                Mis reservas
                            </h2>

                            <p>
                                Revisa tus próximas reservas y su estado.
                            </p>

                        </div>

                        <div className="dashboard-panel-count">
                            {reservas.length}
                        </div>

                    </div>


                    {/* ==================================================
                        SIN RESERVAS
                    ================================================== */}

                    {reservas.length === 0 && (

                        <div className="dashboard-no-reservations">

                            <div className="empty-icon">
                                📅
                            </div>

                            <h3>
                                No tienes reservas
                            </h3>

                            <p>
                                Cuando realices una reserva,
                                aparecerá aquí.
                            </p>

                        </div>

                    )}


                    {/* ==================================================
                        LISTA
                    ================================================== */}

                    {reservas.length > 0 && (

                        <div className="dashboard-reservation-list">

                            {reservas.map(
                                (
                                    item: ReservaEstudiante
                                ) => {

                                    const fecha =
                                        obtenerFecha(
                                            item.inicio
                                        );

                                    const horaInicio =
                                        item.inicio?.split(" ")[1] ?? "";

                                    const horaFin =
                                        item.fin?.split(" ")[1] ?? "";


                                    return (

                                        <article
                                            key={item.id}
                                            className="dashboard-reservation"
                                        >


                                            {/* FECHA */}

                                            <div className="dashboard-reservation-date">

                                                <span className="dashboard-date-day">
                                                    {fecha.dia}
                                                </span>

                                                <span className="dashboard-date-month">
                                                    {fecha.mes}
                                                </span>

                                            </div>


                                            {/* INFORMACIÓN */}

                                            <div className="dashboard-reservation-info">

                                                <div className="dashboard-reservation-top">

                                                    <span className="dashboard-reservation-type">
                                                        RESERVA
                                                    </span>

                                                    <span
                                                        className={
                                                            `dashboard-status ${
                                                                obtenerClaseEstado(
                                                                    item.estado_reserva
                                                                )
                                                            }`
                                                        }
                                                    >
                                                        {
                                                            obtenerTextoEstado(
                                                                item.estado_reserva
                                                            )
                                                        }
                                                    </span>

                                                </div>


                                                <h3>
                                                    {item.laboratorio}
                                                </h3>


                                                <div className="dashboard-reservation-meta">

                                                    <span>
                                                        🕐 {horaInicio} - {horaFin}
                                                    </span>

                                                    <span>
                                                        📍 {item.edificio}
                                                    </span>

                                                    <span>
                                                        Piso {item.piso}
                                                    </span>

                                                    <span>
                                                        Aula {item.aula}
                                                    </span>

                                                </div>


                                                {item.titulo && (

                                                    <p className="dashboard-reservation-reason">

                                                        <strong>
                                                            Motivo:
                                                        </strong>

                                                        {" "}

                                                        {item.titulo}

                                                    </p>

                                                )}

                                            </div>


                                            {/* ESTACIONES */}

                                            {item.estaciones && (

                                                <div className="dashboard-reservation-stations">

                                                    <span>
                                                        🖥️
                                                    </span>

                                                    <strong>
                                                        {item.estaciones}
                                                    </strong>

                                                    <small>
                                                        estaciones
                                                    </small>

                                                </div>

                                            )}

                                        </article>

                                    );

                                }
                            )}

                        </div>

                    )}

                </section>


                {/* ==================================================
                    PANEL LATERAL
                ================================================== */}

                <aside className="dashboard-side-panel">


                    <div className="dashboard-side-card">

                        <div className="dashboard-side-card-header">

                            <div className="side-card-icon">
                                📊
                            </div>

                            <div>

                                <span>
                                    RESUMEN
                                </span>

                                <h3>
                                    Estado de reservas
                                </h3>

                            </div>

                        </div>


                        <div className="dashboard-status-summary">


                            <div className="status-summary-row">

                                <div>

                                    <span className="status-dot pending"></span>

                                    Pendientes

                                </div>

                                <strong>
                                    {reservasPendientes}
                                </strong>

                            </div>


                            <div className="status-summary-row">

                                <div>

                                    <span className="status-dot approved"></span>

                                    Aprobadas

                                </div>

                                <strong>
                                    {reservasAprobadas}
                                </strong>

                            </div>


                            <div className="status-summary-row">

                                <div>

                                    <span className="status-dot completed"></span>

                                    Completadas

                                </div>

                                <strong>
                                    {
                                        reservas.filter(
                                            reserva =>
                                                reserva.estado_reserva ===
                                                "completada"
                                        ).length
                                    }
                                </strong>

                            </div>


                            <div className="status-summary-row">

                                <div>

                                    <span className="status-dot cancelled"></span>

                                    Canceladas

                                </div>

                                <strong>
                                    {
                                        reservas.filter(
                                            reserva =>
                                                reserva.estado_reserva ===
                                                "cancelada"
                                        ).length
                                    }
                                </strong>

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        INFORMACIÓN
                    ================================================== */}

                    <div className="dashboard-side-card dashboard-info-card">

                        <div className="side-card-icon">
                            💡
                        </div>

                        <h3>
                            Recuerda
                        </h3>

                        <p>
                            Revisa el estado de tus reservas
                            antes de utilizar un espacio.
                        </p>

                    </div>

                </aside>

            </div>

        </div>

    );

}