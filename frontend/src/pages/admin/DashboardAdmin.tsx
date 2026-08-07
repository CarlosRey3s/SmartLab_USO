import { useEffect, useState } from "react";
import { getDashboard} from "../../services/dashboard.service";
import type { DashboardResponse} from "../../types/dashboard";
import "../../css/DashboardAdmin.css";

export default function DashboardAdmin() {

  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);



  useEffect(() => {

    loadDashboard();

  }, []);



  const loadDashboard = async () => {

    try {

      const data = await getDashboard();

      setDashboard(data);

    } catch (error) {

      console.error(
        "Error cargando dashboard",
        error
      );

    }

  };

  if (!dashboard) {

    return (

      <div className="content">

        <h3>
          Cargando dashboard...
        </h3>

      </div>

    );

  }



  return (

    <div className="content">


      {/* ==========================
          TARJETAS KPI
      =========================== */}


      <div className="main">


        <div className="panel solicitudes">
          <div className="panel-header">

            Solicitudes Pendientes

          </div>

          <div className="counter">

            {dashboard.kpis.solicitudes_pendientes}

          </div>

          <span className="panel-sub">

            Por aprobar

          </span>

        </div>




        <div className="panel alertas">
          <div className="panel-header">

            Stock Bajo

          </div>


          <div className="counter">

            {dashboard.kpis.stock_bajo}

          </div>

          <span className="panel-sub">

            Items críticos

          </span>

        </div>




        <div className="panel actividades">

          <div className="panel-header">

            Actividades de Hoy

          </div>

          <div className="counter">

            {dashboard.kpis.actividades_hoy}

          </div>

          <span className="panel-sub">

            Clases, reservas y mantenimientos

          </span>

        </div>

        <div className="panel laboratorios">

          <div className="panel-header">

            Espacios Ocupados

          </div>

          <div className="counter">

            {dashboard.kpis.laboratorios_ocupados}

            /

            {dashboard.kpis.total_laboratorios}

          </div>

          <span className="panel-sub">

            En uso actualmente

          </span>
        </div>


      </div>






      {/* ==========================
          CONTENIDO INFERIOR
      =========================== */}


      <div className="dashboard-bottom">





        {/* ==========================
            RESERVAS Y ALERTAS
        =========================== */}


        <div className="card">


          <h3>

            Reservas vs Completadas

          </h3>




          <div className="chart-container">


            <div className="chart-legend">


              <div className="legend-item">

                <div className="bullet reservas"></div>

                <span>

                  Reservas

                </span>

              </div>



              <div className="legend-item">

                <div className="bullet completadas"></div>

                <span>

                  Completadas

                </span>

              </div>



            </div>





            <div className="bars-wrapper">
              {

                dashboard.reservas.map(

                  (item,index)=>(
                    <div

                      className="day-column"

                      key={index}

                    >


                      <div className="bar-pair">
                        <div
                          className="v-bar res"
                          style={{

                            height:
                              `${item.reservas * 10}%`

                          }}
                        />


                        <div
                          className="v-bar comp"
                          style={{
                            height:`${item.completadas * 10}%`
                          }}

                        />


                      </div>



                      <div className="day-label">
                        {item.dia}
                      </div>


                    </div>
                  )

                )


              }
            </div>


          </div>







          <h3>

            Alertas recientes

          </h3>



          <div className="alerts-list">
            {

              dashboard.alertas.map(

                (alerta,index)=>(
                  <div

                    className="alert-item"
                    key={index}
                  >


                    <div

                      className={
                        `status-dot ${alerta.tipo}`
                      }
                    />


                    <div className="alert-text">
                      <h4>

                        {alerta.titulo}

                      </h4>


                      <span>

                        {alerta.detalle}

                      </span>


                    </div>
                  </div>
                )

              )

            }
          </div>




        </div>
        {/* ==========================
            AGENDA
        =========================== */}



        <div className="card">


          <h3>

            Agenda del día

          </h3>



          <div className="saturation-container">


            {

              dashboard.agenda.map(

                (item,index)=>(
                  <div

                    className="agenda-item"

                    key={index}

                  >


                    <span className="day-name">

                      {item.nombre}

                    </span>




                    <div className="h-bar-bg">


                      <div

                        className="h-bar-fill normal"

                        style={{
                          width:`${item.porcentaje}%`
                        }}

                      />


                    </div>




                    <span className="row-status">


                      {
                        item.porcentaje >= 90
                        ?
                        "Saturado"
                        :
                        item.porcentaje >=70
                        ?
                        "Alto"
                        :
                        "Normal"
                      }


                    </span>



                  </div>
                )

              )

            }
          </div>







          <h3>

            Agenda semanal

          </h3>




          <div className="agenda-list">
            {

              dashboard.agendaSemana.map(

                (item,index)=>(
                  <div

                    className="agenda-item"

                    key={index}

                  >


                    <span className="agenda-time">

                      {item.hora}

                    </span>




                    <div className="agenda-details">
                      <h4>
                        {item.actividad}
                      </h4>
                      <span>

                        {item.laboratorio}

                      </span>
                    </div>
                  </div>
                )

              )

            }




          </div>





        </div>





      </div>


    </div>
  );

}