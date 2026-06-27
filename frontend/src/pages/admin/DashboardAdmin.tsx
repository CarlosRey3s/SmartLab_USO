import "../../css/DashboardAdmin.css";

export default function DashboardAdmin() {
  return (
    <div className="content">

      {/* ===== TOP CARDS (Métricas Principales) ===== */}
      <div className="main">
        <div className="panel solicitudes">
          <div className="panel-header">Solicitudes Pendientes</div>
          <div className="counter">4</div>
          <span className="panel-sub">Por Aprobar</span>
        </div>

        <div className="panel alertas">
          <div className="panel-header">Stock Bajo</div>
          <div className="counter">12</div>
          <span className="panel-sub">Items críticos</span>
        </div>

        <div className="panel actividades">
          <div className="panel-header">Actividades de Hoy</div>
          <div className="counter">18</div>
          <span className="panel-sub">8 Clases, 7 Reservas, 3 Mant</span>
        </div>

        <div className="panel laboratorios">
          <div className="panel-header">Laboratorios Ocupados</div>
          <div className="counter">5/12</div>
          <span className="panel-sub">En uso en tiempo real</span>
        </div>
      </div>

      {/* ===== BOTTOM SECTION (Gráficos y Detalles) ===== */}
      <div className="dashboard-bottom">

        {/* COLUMNA IZQUIERDA: RESERVAS Y ALERTAS */}
        <div className="card">
          <h3>Reservas vs. completadas</h3>
          
          {/* Gráfico de Barras Dobles */}
          <div className="chart-container">
            <div className="chart-legend">
              <div className="legend-item">
                <div className="bullet reservas"></div>
                <span>Reservas</span>
              </div>
              <div className="legend-item">
                <div className="bullet completadas"></div>
                <span>Completadas</span>
              </div>
            </div>

            <div className="bars-wrapper">
              {/* Lun */}
              <div className="day-column">
                <div className="bar-pair">
                  <div className="v-bar res" style={{ height: "65%" }}></div>
                  <div className="v-bar comp" style={{ height: "45%" }}></div>
                </div>
                <div className="day-label">Lun</div>
              </div>
              {/* Mar */}
              <div className="day-column">
                <div className="bar-pair">
                  <div className="v-bar res" style={{ height: "50%" }}></div>
                  <div className="v-bar comp" style={{ height: "25%" }}></div>
                </div>
                <div className="day-label">Mar</div>
              </div>
              {/* Mie */}
              <div className="day-column">
                <div className="bar-pair">
                  <div className="v-bar res" style={{ height: "50%" }}></div>
                  <div className="v-bar comp" style={{ height: "50%" }}></div>
                </div>
                <div className="day-label">Mie</div>
              </div>
              {/* Jue */}
              <div className="day-column">
                <div className="bar-pair">
                  <div className="v-bar res" style={{ height: "95%" }}></div>
                  <div className="v-bar comp" style={{ height: "80%" }}></div>
                </div>
                <div className="day-label">Jue</div>
              </div>
              {/* Vie */}
              <div className="day-column">
                <div className="bar-pair">
                  <div className="v-bar res" style={{ height: "65%" }}></div>
                  <div className="v-bar comp" style={{ height: "50%" }}></div>
                </div>
                <div className="day-label">Vie</div>
              </div>
              {/* Sab */}
              <div className="day-column">
                <div className="bar-pair">
                  <div className="v-bar res" style={{ height: "35%" }}></div>
                  <div className="v-bar comp" style={{ height: "15%" }}></div>
                </div>
                <div className="day-label">Sab</div>
              </div>
            </div>
          </div>

          {/* Alertas Recientes */}
          <h3>Alertas recientes</h3>
          <div className="alerts-list">
            <div className="alert-item">
              <div className="status-dot red"></div>
              <div className="alert-text">
                <h4>Acido sulfúrico bajo mínimo - Lab 3</h4>
                <span>Hace 10 min</span>
              </div>
            </div>
            <div className="alert-item">
              <div className="status-dot yellow"></div>
              <div className="alert-text">
                <h4>Solicitud de reserva - Juan Pérez</h4>
                <span>Hace 25 min</span>
              </div>
            </div>
            <div className="alert-item">
              <div className="status-dot pink"></div>
              <div className="alert-text">
                <h4>Microscopio #4 requiere mante..</h4>
                <span>Hace 1h</span>
              </div>
            </div>
            <div className="alert-item">
              <div className="status-dot green"></div>
              <div className="alert-text">
                <h4>Nuevo usuario - Juan Pérez</h4>
                <span>Hace 2h</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: SATURACIÓN Y AGENDA */}
        <div className="card">
          <h3>Saturación de clases</h3>
          
          {/* Barras de Saturación Horizontales */}
          <div className="saturation-container">
            <div className="h-bar-row">
              <span className="day-name">Lun</span>
              <div className="h-bar-bg"><div className="h-bar-fill normal" style={{ width: "65%" }}></div></div>
              <span className="row-status normal">Normal</span>
            </div>
            <div className="h-bar-row">
              <span className="day-name">Mar</span>
              <div className="h-bar-bg"><div className="h-bar-fill alto" style={{ width: "85%" }}></div></div>
              <span className="row-status alto">Alto</span>
            </div>
            <div className="h-bar-row">
              <span className="day-name">Mie</span>
              <div className="h-bar-bg"><div className="h-bar-fill normal" style={{ width: "75%" }}></div></div>
              <span className="row-status normal">Normal</span>
            </div>
            <div className="h-bar-row">
              <span className="day-name">Jue</span>
              <div className="h-bar-bg"><div className="h-bar-fill saturado" style={{ width: "100%" }}></div></div>
              <span className="row-status saturado">Saturado</span>
            </div>
            <div className="h-bar-row">
              <span className="day-name">Vie</span>
              <div className="h-bar-bg"><div className="h-bar-fill alto" style={{ width: "90%" }}></div></div>
              <span className="row-status alto">Alto</span>
            </div>
            <div className="h-bar-row">
              <span className="day-name">Sab</span>
              <div className="h-bar-bg"><div className="h-bar-fill normal" style={{ width: "40%" }}></div></div>
              <span className="row-status normal">Normal</span>
            </div>
          </div>

          {/* Alertas Recientes (Agenda) */}
          <h3>Alertas recientes</h3>
          <div className="agenda-list">
            <div className="agenda-item">
              <span className="agenda-time">9:00</span>
              <div className="agenda-details">
                <h4>Clase de Física I</h4>
                <span>Lab 1 - 25 alumnos</span>
              </div>
            </div>
            <div className="agenda-item">
              <span className="agenda-time">11:00</span>
              <div className="agenda-details">
                <h4>Práctica de Química</h4>
                <span>Lab 3 - 18 alumnos</span>
              </div>
            </div>
            <div className="agenda-item">
              <span className="agenda-time">14:00</span>
              <div className="agenda-details">
                <h4>Clase de Biología</h4>
                <span>Lab 2 - 22 alumnos</span>
              </div>
            </div>
            <div className="agenda-item">
              <span className="agenda-time">16:00</span>
              <div className="agenda-details">
                <h4>Mantenimiento Lab 4</h4>
                <span>Técnico asignado</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}