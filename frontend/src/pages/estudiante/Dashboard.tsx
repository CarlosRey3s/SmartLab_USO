import {
    useEffect,
    useState
} from "react";

import "../../css/evaluaciones.css";


import {
    obtenerDashboardEstudiante
} from "../../services/estudianteDashboard.service";


import type {
    EstudianteDashboard
} from "../../types/estudianteDashboard.types";



export default function Dashboard(){


    const [
        dashboard,
        setDashboard
    ] = useState<EstudianteDashboard | null>(null);



    const [
        openAccordion,
        setOpenAccordion
    ] = useState<string | null>(null);





    const toggleAccordion = (id:string)=>{


        if(openAccordion === id){

            setOpenAccordion(null);

        }else{

            setOpenAccordion(id);

        }


    };






    useEffect(()=>{


        cargarDashboard();


    },[]);






    const cargarDashboard = async()=>{


        try{


            console.log(
                "Dashboard estudiante funcionando"
            );


            const data =
            await obtenerDashboardEstudiante();



            console.log(
                "Datos recibidos:",
                data
            );



            setDashboard(data);




            if(data.horario.length > 0){


                setOpenAccordion(
                    `horario_${data.horario[0].id}`
                );


            }



        }catch(error){


            console.error(
                "Error cargando dashboard estudiante",
                error
            );


        }


    };






    if(!dashboard){


        return (

            <div className="student-dashboard">


                <h2 className="section-main-title">

                    Cargando laboratorios...

                </h2>


            </div>

        );


    }






    return (


        <div className="student-dashboard">



            <h2 className="section-main-title">

                Mis Laboratorios

            </h2>






            {/* ================= HORARIO ACADÉMICO ================= */}



            <div className="category-block">



                <div className="category-header">


                    <span className="checkbox-icon"></span>


                    <h3>

                        HORARIO ACADÉMICO

                    </h3>


                </div>







                <div className="accordion-list">



                    {
                        dashboard.horario.length === 0 &&


                        <p>
                            No tienes clases asignadas.
                        </p>

                    }






                    {
                        dashboard.horario.map((item)=>{


                            const id =
                            `horario_${item.id}`;



                            return (


                                <div

                                    key={item.id}

                                    className={
                                        `accordion-item ${
                                            openAccordion === id
                                            ?
                                            "open"
                                            :
                                            "closed"
                                        }`
                                    }

                                >





                                    <div

                                        className="accordion-summary"

                                        onClick={()=>toggleAccordion(id)}

                                        style={{
                                            cursor:"pointer"
                                        }}

                                    >




                                        <div className="summary-left">



                                            <span className="icon-lab microscope">

                                                🔬

                                            </span>



                                            <span className="label-type">

                                                Clases

                                            </span>



                                            <span className="label-name">

                                                {item.laboratorio}

                                            </span>



                                        </div>





                                        <span className="arrow-icon">


                                            {
                                                openAccordion === id
                                                ?
                                                "▲"
                                                :
                                                "▼"
                                            }


                                        </span>




                                    </div>









                                    {
                                        openAccordion === id &&



                                        <div className="accordion-content">





                                            <div className="info-group">


                                                <h4>

                                                    Horario asignado

                                                </h4>



                                                <p>

                                                    {item.inicio}

                                                    {" - "}

                                                    {item.fin}


                                                </p>



                                            </div>








                                            <div className="info-group details-section">



                                                <h4>

                                                    Detalles del Laboratorio

                                                </h4>





                                                <p>

                                                    <strong>
                                                        Materia:
                                                    </strong>

                                                    {" "}

                                                    {item.materia}

                                                </p>





                                                <p>

                                                    <strong>
                                                        Docente:
                                                    </strong>

                                                    {" "}

                                                    {item.docente}

                                                </p>






                                                <p>

                                                    <strong>
                                                        Edificio:
                                                    </strong>

                                                    {" "}

                                                    {item.edificio}

                                                </p>






                                                <p>

                                                    <strong>
                                                        Aula:
                                                    </strong>

                                                    {" "}

                                                    {item.aula}

                                                </p>






                                                <p>

                                                    <strong>
                                                        Estado:
                                                    </strong>


                                                    {" "}


                                                    <span className="status-active">

                                                        Activo

                                                    </span>


                                                </p>




                                            </div>




                                        </div>


                                    }





                                </div>



                            );


                        })


                    }





                </div>




            </div>









            {/* ================= RESERVAS ================= */}



            <div className="category-block">



                <div className="category-header">



                    <span className="checkbox-icon"></span>



                    <h3>

                        RESERVAS DE LABORATORIO

                    </h3>



                </div>







                <div className="accordion-list">





                    {
                        dashboard.reservas.length === 0 &&


                        <p>

                            No tienes reservas realizadas.

                        </p>


                    }






                    {
                        dashboard.reservas.map((item)=>{


                            const id =
                            `reserva_${item.id}`;




                            return (


                                <div

                                    key={item.id}

                                    className={
                                        `accordion-item ${
                                            openAccordion === id
                                            ?
                                            "open"
                                            :
                                            "closed"
                                        }`
                                    }


                                >




                                    <div

                                        className="accordion-summary"

                                        onClick={()=>toggleAccordion(id)}

                                        style={{
                                            cursor:"pointer"
                                        }}

                                    >



                                        <div className="summary-left">



                                            <span className="icon-lab folder">

                                                📁

                                            </span>



                                            <span className="label-type">

                                                Reserva

                                            </span>




                                            <span className="label-name">

                                                {item.laboratorio}

                                            </span>




                                        </div>






                                        <span className="arrow-icon">


                                            {
                                                openAccordion === id
                                                ?
                                                "▲"
                                                :
                                                "▼"
                                            }


                                        </span>



                                    </div>







                                    {
                                        openAccordion === id &&


                                        <div className="accordion-content">



                                            <div className="info-group">



                                                <h4>

                                                    Información de reserva

                                                </h4>





                                                <p>

                                                    <strong>
                                                        Título:
                                                    </strong>

                                                    {" "}

                                                    {item.titulo}

                                                </p>






                                                <p>

                                                    <strong>
                                                        Inicio:
                                                    </strong>

                                                    {" "}

                                                    {item.inicio}

                                                </p>






                                                <p>

                                                    <strong>
                                                        Estado:
                                                    </strong>

                                                    {" "}

                                                    {item.estado_reserva}

                                                </p>






                                                {
                                                    item.nota_adicional &&


                                                    <p>

                                                        <strong>
                                                            Nota:
                                                        </strong>


                                                        {" "}

                                                        {item.nota_adicional}


                                                    </p>


                                                }





                                            </div>



                                        </div>


                                    }





                                </div>


                            );



                        })


                    }





                </div>




            </div>






        </div>


    );


}