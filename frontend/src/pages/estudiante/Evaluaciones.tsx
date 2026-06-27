import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/evaluaciones.css";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const Evaluaciones: React.FC = () => {
  const navigate = useNavigate();

  // Estados para el calendario
  const [currentDate, setCurrentDate] = useState(new Date()); // Mes actual
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate()); // Día actual seleccionado

  const monthName = meses[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(year, currentDate.getMonth(), 1).getDay();

  const emptyDays = Array.from({ length: firstDayIndex }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Fechas simuladas con pendientes
  const pendingDays = [10, 17];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
    setSelectedDay(null); // Limpiar selección al cambiar de mes
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const padZero = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="main" style={{ gap: "40px", padding: "30px 40px" }}>
      {/* IZQUIERDA */}
      <div className="schedule" style={{ flex: 1.5 }}>
        <h2 style={{ color: "#000", fontSize: "28px", margin: "0 0 5px 0", fontWeight: "600" }}>Mis evaluaciones</h2>
        <p style={{ color: "#000", margin: "0 0 30px 0", fontSize: "16px" }}>Gestión de evaluaciones de laboratorios</p>

        <div style={{ display: "flex", gap: "40px", marginBottom: "25px", color: "#000", fontSize: "16px" }}>
          <div style={{ fontWeight: "500", cursor: "pointer" }}>Pendientes (2)</div>
          <div style={{ color: "#000", cursor: "pointer" }}>Historial</div>
        </div>

        <p style={{ color: "#000", fontSize: "16px", marginBottom: "15px", paddingLeft: "5px" }}>
          {selectedDay ? `${padZero(selectedDay)} ${monthName.substring(0, 3).toUpperCase()} ${year}` : "Selecciona una fecha"}
        </p>

        {selectedDay && pendingDays.includes(selectedDay) ? (
          <div className="reserva-card" style={{
            position: "relative",
            background: "#FFFFFF",
            borderRadius: "15px",
            padding: "25px 35px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            height: "200px"
          }}>
            <h3 style={{ margin: "0", color: "#000", fontSize: "18px", fontWeight: "600" }}>Laboratorio de Electronica</h3>
            <p style={{ margin: "0", color: "#555", fontSize: "16px" }}>10:00 am - 12:00 pm</p>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ color: "var(--rosado)", fontSize: "16px", fontWeight: "bold" }}>
                Evaluacion Requerida
              </span>
              <span 
                style={{ color: "var(--verde)", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => navigate('/realizar-evaluacion')}
              >
                Realizar evaluación
              </span>
            </div>
          </div>
        ) : (
          <div className="reserva-card" style={{
            background: "#FFFFFF",
            borderRadius: "15px",
            padding: "25px 35px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "200px"
          }}>
            <p style={{ color: "#707EAE", fontSize: "16px", margin: 0, textAlign: "center" }}>
              No hay evaluaciones disponibles para esta fecha.
            </p>
          </div>
        )}
      </div>

      {/* DERECHA */}
      <div className="right-panel" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "40px", maxWidth: "400px" }}>

        {/* CALENDARIO */}
        <div style={{ background: "#FFFFFF", padding: "10px" }}>
          <h4 style={{ textAlign: "center", color: "#000", margin: "0 0 20px 0", fontSize: "14px", fontWeight: "700" }}>Calendario de Actividades</h4>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", fontSize: "13px", fontWeight: "700", color: "#000", padding: "0 10px" }}>
            <span style={{ cursor: "pointer", color: "#555", padding: "5px" }} onClick={handlePrevMonth}>&lt;</span>
            <span>{monthName} {year}</span>
            <span style={{ cursor: "pointer", color: "#555", padding: "5px" }} onClick={handleNextMonth}>&gt;</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: "11px", color: "#555", marginBottom: "15px" }}>
            <span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: "13px", color: "#000", gap: "8px", rowGap: "15px" }}>
            {emptyDays.map(empty => (
              <span key={`empty-${empty}`}></span>
            ))}

            {days.map(day => {
              const isSelected = selectedDay === day;
              const isPending = pendingDays.includes(day);

              return (
                <span
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    background: isSelected ? "var(--dorado)" : "transparent",
                    color: isSelected ? "#000" : "inherit",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    transition: "0.2s",
                    fontWeight: isSelected ? "bold" : "normal"
                  }}
                >
                  {day}
                  {isPending && (
                    <span style={{
                      position: "absolute",
                      bottom: "-8px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "4px",
                      height: "4px",
                      backgroundColor: "var(--rosado)",
                      borderRadius: "50%"
                    }}></span>
                  )}
                </span>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "25px", fontSize: "11px", color: "#555" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "4px", height: "4px", backgroundColor: "var(--rosado)", borderRadius: "50%" }}></span>Pendiente</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "4px", height: "4px", backgroundColor: "var(--verde)", borderRadius: "50%" }}></span>Completado</span>
          </div>
        </div>

        {/* CARD PENDIENTE */}
        {selectedDay ? (
          pendingDays.includes(selectedDay) ? (
            <div style={{ background: "#D9D9D9", borderRadius: "20px", padding: "35px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "25px" }}>
              <p style={{ margin: 0, color: "#555", fontSize: "17px", fontWeight: "400" }}>{padZero(selectedDay)} {monthName.substring(0, 3).toUpperCase()} {year}</p>
              <h4 style={{ margin: 0, color: "#000", fontSize: "17px", fontWeight: "600" }}>Laboratorio de Electronica</h4>
              <p style={{ margin: 0, color: "var(--rosado)", fontSize: "16px", fontWeight: "bold" }}>Pendiente</p>
            </div>
          ) : (
            <div style={{ background: "#D9D9D9", borderRadius: "20px", padding: "35px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "15px", justifyContent: "center" }}>
              <p style={{ margin: 0, color: "#555", fontSize: "17px", fontWeight: "400" }}>{padZero(selectedDay)} {monthName.substring(0, 3).toUpperCase()} {year}</p>
              <p style={{ margin: 0, color: "#555", fontSize: "16px", fontWeight: "400", textAlign: "center" }}>No hay evaluaciones<br />hoy.</p>
            </div>
          )
        ) : (
          <div style={{ background: "#D9D9D9", borderRadius: "20px", padding: "35px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "25px", opacity: 0.5 }}>
            <p style={{ margin: 0, color: "#555", fontSize: "17px" }}>Seleccione un día</p>
          </div>
        )}
      </div>

    </div>
  );
};
