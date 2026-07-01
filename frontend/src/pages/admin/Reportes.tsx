import React, { useState } from "react";
import "../../css/ReportesComentarios.css";

// Definimos la interfaz para la estructura de un mensaje/reporte
interface MessageReport {
  id: number;
  title: string;
  user: string;
  date: string;
  text: string;
  tag: string;
  status: string;
}

// Tipos permitidos para las pestañas y filtros
type TabType = "uso" | "bandeja";
type FilterType = "todos" | "pendientes" | "respondidos";

export const ReportesView: React.FC = () => {
  // Estado para controlar la pestaña activa con tipo estricto
  const [activeTab, setActiveTab] = useState<TabType>("uso");
  
  // Estado para el filtro de la bandeja de atención
  const [filter, setFilter] = useState<FilterType>("todos");

  // Estado para el mensaje seleccionado en la bandeja
  const [selectedMessage, setSelectedMessage] = useState<MessageReport>({
    id: 1,
    title: "Olvidé mi calculadora científica",
    user: "Carlos Martínez",
    date: "2026-06-20",
    text: "Hola, ayer dejé mi calculadora Casio en la mesa 3 del lab de física. Tiene una calcomanía roja en la parte de atrás. ¿Me pueden confirmar si la encontraron?",
    tag: "Objetos Perdidos",
    status: "Pendiente"
  });

  return (
    <div className="reports-container">
      
      {/* ================= HEADER CONTENIENDO ÚNICAMENTE LAS PESTAÑAS ================= */}
      <div className="reports-header">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === "uso" ? "active" : ""}`}
            onClick={() => setActiveTab("uso")}
          >
            Uso de laboratorio
          </button>
          <button 
            className={`tab ${activeTab === "bandeja" ? "active" : ""}`}
            onClick={() => setActiveTab("bandeja")}
          >
            Bandeja de atención
          </button>
        </div>
      </div>

      {/* ================= CONTENIDO DINÁMICO ================= */}
      
      {activeTab === "bandeja" && (
        <div className="reports-grid">
          {/* LISTA DE COMENTARIOS */}
          <div className="reports-list card">
            <div className="filters">
              <button 
                className={`filter ${filter === "todos" ? "active" : ""}`}
                onClick={() => setFilter("todos")}
              >
                Todos
              </button>
              <button 
                className={`filter ${filter === "pendientes" ? "active" : ""}`}
                onClick={() => setFilter("pendientes")}
              >
                Pendientes
              </button>
              <button 
                className={`filter ${filter === "respondidos" ? "active" : ""}`}
                onClick={() => setFilter("respondidos")}
              >
                Respondidos
              </button>
            </div>

            <div className="message-item active">
              <div className="message-item-header">
                <span className="icon">🔧</span>
                <div className="user-info">
                  <div className="user">Carlos Martínez</div>
                  <p className="subject">Olvidé mi calculadora</p>
                  <p className="preview">Hola, ayer olvide mi calculadora....</p>
                </div>
                <span className="date">2026-06-20</span>
              </div>
            </div>

            <div className="message-item">
              <div className="message-item-header">
                <span className="icon monitor">🖥️</span>
                <div className="user-info">
                  <div className="user">Alex Campos</div>
                  <p className="subject">Silla rota y el proyector parpadea</p>
                  <p className="preview">El proyector del laboratorio...</p>
                </div>
                <span className="date">2026-06-20</span>
              </div>
            </div>

            <div className="message-item">
              <div className="message-item-header">
                <span className="icon pencil">✏️</span>
                <div className="user-info">
                  <div className="user">Ana López</div>
                  <p className="subject">Más reactivos para prácticas libres</p>
                  <p className="preview">Sería excelente si pudiéramos...</p>
                </div>
                <span className="date">2026-06-20</span>
              </div>
            </div>
          </div>

          {/* DETALLE DEL COMENTARIO */}
          <div className="reports-detail card">
            <div className="detail-tags">
              <span className="tag-type">{selectedMessage.tag}</span>
              <span className="tag-status">{selectedMessage.status}</span>
            </div>
            
            <h3>{selectedMessage.title}</h3>
            <p className="from">De: {selectedMessage.user}</p>

            <div className="message-box">
              {selectedMessage.text}
            </div>

            <label className="management-label">Gestión y Respuesta</label>
            <textarea placeholder="Escribe tu respuesta aquí..." />

            <div className="detail-actions">
              <button className="btn-send">Enviar</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "uso" && (
        <div className="stats-container card">
          {/* ESTADÍSTICAS TARJETAS */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-icon circle-blue">🕒</div>
              <div className="stat-text">
                <span>Horas Reservadas (Mes)</span>
                <h3>1450 h</h3>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon circle-green">🧪</div>
              <div className="stat-text">
                <span>Lab. Más Frecuente</span>
                <h3>Química Analítica</h3>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon circle-orange">👥</div>
              <div className="stat-text">
                <span>Estudiantes Activos</span>
                <h3>320</h3>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon circle-purple">📅</div>
              <div className="stat-text">
                <span>Instrumentos Prestados</span>
                <h3>120</h3>
              </div>
            </div>
          </div>

          {/* TABLA DE DESGLOSE */}
          <div className="table-section">
            <div className="table-header">
              <h3>Desglose por Laboratorio</h3>

              <div className="table-actions">
                <select className="select-custom">
                  <option>Enero</option>
                </select>
                <span className="separator">-</span>
                <select className="select-custom">
                  <option>Junio</option>
                </select>
                <select className="select-custom year-select">
                  <option>2026</option>
                </select>

                <button className="export">Exportar PDF</button>
              </div>
            </div>

            <table className="custom-table">
              <thead>
                <tr>
                  <th>Laboratorio</th>
                  <th>Total Reservas</th>
                  <th>Horas Uso</th>
                  <th>Estado Actual</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Lab. Química Analítica</td>
                  <td>45</td>
                  <td>120 h</td>
                  <td className="status-cell"><span className="status-ok">Operativo</span></td>
                </tr>

                <tr>
                  <td>Lab. Física</td>
                  <td>38</td>
                  <td>95 h</td>
                  <td className="status-cell"><span className="status-ok">Operativo</span></td>
                </tr>

                <tr>
                  <td>Lab. Biología</td>
                  <td>22</td>
                  <td>60 h</td>
                  <td className="status-cell"><span className="status-warn">Mantenimiento</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};