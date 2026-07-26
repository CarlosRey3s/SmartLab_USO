import {
    useEffect,
    useState
} from "react";


import "../../css/docente-dashboard.css";


import {
    obtenerDashboardDocente
} from "../../services/docenteDashboard.service";


import type {
    DocenteDashboard
} from "../../types/docenteDashboard.types";



export default function DocenteDashboard(){


    const [
        dashboard,
        setDashboard
    ] = useState<DocenteDashboard | null>(null);



    useEffect(()=>{


        cargarDashboard();


    },[]);




    const cargarDashboard = async()=>{


        try{


            const data =
            await obtenerDashboardDocente();


            console.log(
                "Dashboard docente:",
                data
            );


            setDashboard(data);



        }catch(error){


            console.error(
                "Error dashboard docente:",
                error
            );


        }


    };





    if(!dashboard){


        return (

            <h2>
                Cargando dashboard docente...
            </h2>

        );


    }




    return (

        <div className="docente-container">


            <div className="docente-header">

                <div>

                    <h2 className="docente-title">
                        Dashboard Docente
                    </h2>


                    <p className="docente-subtitle">
                        Gestión de clases, laboratorios y reservas
                    </p>


                </div>

            </div>





            <div className="docente-grid">





                <div className="docente-card panel">


                    <h3>
                        Mis Laboratorios
                    </h3>



                    {
                        dashboard.laboratorios.map((lab)=>(


                            <div
                            className="item highlight"
                            key={lab.id}
                            >


                                <strong>
                                    {lab.nombre}
                                </strong>


                                <p>
                                    Edificio: {lab.edificio}
                                </p>


                                <p>
                                    Aula: {lab.aula}
                                </p>


                                <p>
                                    Capacidad:
                                    {" "}
                                    {lab.capacidad_maxima}
                                </p>


                                <p>
                                    Estado:
                                    {" "}
                                    {lab.estado}
                                </p>


                            </div>


                        ))
                    }



                </div>







                <div className="docente-card panel">


                    <h3>
                        Agenda Académica
                    </h3>



                    {
                        dashboard.agenda.map((item)=>(


                            <div
                            className="item"
                            key={item.id}
                            >


                                <span className="time">

                                    {item.inicio}
                                    {" - "}
                                    {item.fin}

                                </span>


                                <strong>

                                    {item.materia}

                                </strong>


                                <p>

                                    {item.laboratorio}

                                </p>


                                <p>

                                    {item.num_estudiantes}
                                    {" estudiantes"}

                                </p>



                            </div>


                        ))
                    }



                </div>







                <div className="docente-card panel">


                    <h3>
                        Reservas y Notificaciones
                    </h3>



                    {
                        dashboard.reservas.length === 0 &&

                        <p>
                            No hay reservas.
                        </p>

                    }



                    {
                        dashboard.reservas.map((reserva)=>(


                            <div
                            className="item warning"
                            key={reserva.actividad_id}
                            >


                                <strong>
                                    {reserva.titulo}
                                </strong>


                                <p>
                                    {reserva.laboratorio}
                                </p>


                                <span>

                                    {reserva.inicio}
                                    {" - "}
                                    {reserva.fin}

                                </span>


                                {
                                    reserva.nota_adicional &&

                                    <p>
                                        Nota:
                                        {" "}
                                        {reserva.nota_adicional}
                                    </p>

                                }


                            </div>


                        ))
                    }



                </div>




            </div>


        </div>


    );


}