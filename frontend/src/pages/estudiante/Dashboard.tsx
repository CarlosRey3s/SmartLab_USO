import { useState } from "react";
import "../../css/evaluaciones.css";

export default function Dashboard() {
  // Definimos que el estado acepta tipos 'string' o 'null'
  const [openAccordion, setOpenAccordion] = useState<string | null>("sistemas_l1");

  // Tipamos el parámetro 'id' explícitamente como 'string'
  const toggleAccordion = (id: string): void => {
    if (openAccordion === id) {
      setOpenAccordion(null); // Lo cierra si ya estaba abierto
    } else {
      setOpenAccordion(id); // Lo abre si estaba cerrado
    }
  };

  return (
    <div className="student-dashboard">
      <h2 className="section-main-title">Mis Laboratorios</h2>

      {/* ================= SECCIÓN: HORARIO ACADÉMICO ================= */}
      <div className="category-block">
        <div className="category-header">
          <span className="checkbox-icon"></span>
          <h3>HORARIO ACADÉMICO</h3>
        </div>

        <div className="accordion-list">
          
          {/* Item 1: LABORATORIO FÍSICA Lab L2 */}
          <div className={`accordion-item ${openAccordion === "fisica_l2" ? "open" : "closed"}`}>
            <div 
              className="accordion-summary" 
              onClick={() => toggleAccordion("fisica_l2")} 
              style={{ cursor: 'pointer' }}
            >
              <div className="summary-left">
                <span className="icon-lab microscope">🔬</span>
                <span className="label-type">Clases</span>
                <span className="label-name">LABORATORIO FÍSICA Lab L2</span>
              </div>
              <span className="arrow-icon">{openAccordion === "fisica_l2" ? "▲" : "▼"}</span>
            </div>
            
            {/* Contenido condicional para Física L2 */}
            {openAccordion === "fisica_l2" && (
              <div className="accordion-content">
                <div className="info-group">
                  <h4>Horarios asignado</h4>
                  <p>Martes: 08:00 am - 10:00 am</p>
                </div>
              </div>
            )}
          </div>

          {/* Item 2: SISTEMAS DIGITALES Lab L1 */}
          <div className={`accordion-item ${openAccordion === "sistemas_l1" ? "open" : "closed"}`}>
            <div 
              className="accordion-summary" 
              onClick={() => toggleAccordion("sistemas_l1")} 
              style={{ cursor: 'pointer' }}
            >
              <div className="summary-left">
                <span className="icon-lab microscope">🔬</span>
                <span className="label-type">Clases</span>
                <span className="label-name">SISTEMAS DIGITALES Lab L1</span>
              </div>
              <span className="arrow-icon">{openAccordion === "sistemas_l1" ? "▲" : "▼"}</span>
            </div>
            
            {/* Contenido condicional para Sistemas Digitales */}
            {openAccordion === "sistemas_l1" && (
              <div className="accordion-content">
                <div className="info-group">
                  <h4>Horarios asignado</h4>
                  <p>Lunes: 10:00 am - 12:00 pm</p>
                  <p>Viernes: 10:00 am - 12:00 pm</p>
                </div>

                <div className="info-group details-section">
                  <h4>Detalles del Laboratorio 001:</h4>
                  <p><strong>Edificio:</strong> L1</p>
                  <p><strong>Descripcion:</strong> Especialidad en electronica digital</p>
                  <p><strong>Estado:</strong> <span className="status-active">Activo</span></p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ================= SECCIÓN: RESERVAS DE LABORATORIO ================= */}
      <div className="category-block">
        <div className="category-header">
          <span className="checkbox-icon"></span>
          <h3>RESERVAS DE LABORATORIO</h3>
        </div>

        <div className="accordion-list">
          
          {/* Item 3: LABORATORIO FÍSICA Lab 01 */}
          <div className={`accordion-item ${openAccordion === "fisica_01" ? "open" : "closed"}`}>
            <div 
              className="accordion-summary" 
              onClick={() => toggleAccordion("fisica_01")} 
              style={{ cursor: 'pointer' }}
            >
              <div className="summary-left">
                <span className="icon-lab folder">📁</span>
                <span className="label-type">Clases</span>
                <span className="label-name">LABORATORIO FÍSICA Lab 01</span>
              </div>
              <span className="arrow-icon">{openAccordion === "fisica_01" ? "▲" : "▼"}</span>
            </div>

            {/* Contenido condicional para Física 01 */}
            {openAccordion === "fisica_01" && (
              <div className="accordion-content">
                <div className="info-group">
                  <h4>Horarios asignado</h4>
                  <p>Miércoles: 02:00 pm - 04:00 pm</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}