import React, { useState, useEffect } from "react";
import "../../css/ReportesComentarios.css";
import { customToast } from "../../components/custom-toast/CustomToast";

interface SugerenciaAdmin {
  id: number;
  titulo: string;
  comentario: string;
  estado_gestion: string;
  respuesta_coordinador: string | null;
  fecha_envio: string;
  usuario_nombre: string;
  usuario_apellido: string;
  laboratorio_nombre: string | null;
}

// Tipos permitidos para las pestañas y filtros
type TabType = "uso" | "bandeja";
type FilterType = "todos" | "pendientes" | "respondidos";

export const ReportesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("uso");
  const [filter, setFilter] = useState<FilterType>("todos");
  
  const [sugerencias, setSugerencias] = useState<SugerenciaAdmin[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SugerenciaAdmin | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "bandeja") {
      fetchSugerencias();
    }
  }, [activeTab]);

  const fetchSugerencias = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/sugerencias");
      const data = await res.json();
      if (data.status === "success") {
        setSugerencias(data.data);
        if (data.data.length > 0 && !selectedMessage) {
          setSelectedMessage(data.data[0]);
        }
      }
    } catch (error) {
      console.error("Error al cargar sugerencias:", error);
    }
  };

  const handleEnviarRespuesta = async () => {
    if (!selectedMessage) return;
    if (!respuesta.trim()) {
      customToast.error("La respuesta no puede estar vacía.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/sugerencias/${selectedMessage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respuesta_coordinador: respuesta,
          estado_gestion: "atendida"
        })
      });

      const data = await res.json();
      if (data.status === "success") {
        customToast.success("Respuesta enviada y estado actualizado.");
        setRespuesta("");
        fetchSugerencias();
        // Actualizar el seleccionado localmente para reflejar el cambio inmediato
        setSelectedMessage({ ...selectedMessage, estado_gestion: "atendida", respuesta_coordinador: respuesta });
      } else {
        customToast.error(data.message || "Error al enviar la respuesta.");
      }
    } catch (error) {
      console.error(error);
      customToast.error("Error de conexión al servidor.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSugerencias = sugerencias.filter(sug => {
    if (filter === "todos") return true;
    if (filter === "pendientes") return sug.estado_gestion === "pendiente" || sug.estado_gestion === "en_revisión";
    if (filter === "respondidos") return sug.estado_gestion === "atendida" || sug.estado_gestion === "archivada";
    return true;
  });

  const formatearFecha = (fechaStr: string) => {
    const f = new Date(fechaStr);
    return f.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getIconForCategory = (comentario: string) => {
    if (comentario.includes("Objetos Perdidos")) return "🔍";
    if (comentario.includes("Equipos")) return "🖥️";
    if (comentario.includes("Laboratorios") || comentario.includes("Inventario")) return "🧪";
    return "✉️";
  };

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

            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
              {filteredSugerencias.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No hay mensajes en esta categoría.
                </div>
              ) : (
                filteredSugerencias.map((sug) => {
                  const match = sug.comentario.match(/\[Categoría:\s(.*?)\]\n([\s\S]*)/);
                  const preview = match ? match[2] : sug.comentario;

                  return (
                    <div 
                      key={sug.id}
                      className={`message-item ${selectedMessage?.id === sug.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedMessage(sug);
                        setRespuesta(""); // Limpiar respuesta al cambiar
                      }}
                    >
                      <div className="message-item-header">
                        <span className="icon">{getIconForCategory(sug.comentario)}</span>
                        <div className="user-info">
                          <div className="user">{sug.usuario_nombre} {sug.usuario_apellido}</div>
                          <p className="subject">{sug.titulo}</p>
                          <p className="preview">{preview.substring(0, 40)}{preview.length > 40 ? '...' : ''}</p>
                        </div>
                        <span className="date">{formatearFecha(sug.fecha_envio)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* DETALLE DEL COMENTARIO */}
          {selectedMessage ? (
            <div className="reports-detail card">
              <div className="detail-tags">
                <span className="tag-type">
                  {selectedMessage.laboratorio_nombre || "General"}
                </span>
                <span className={`tag-status ${selectedMessage.estado_gestion === 'atendida' ? 'status-ok' : ''}`}>
                  {selectedMessage.estado_gestion.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <h3>{selectedMessage.titulo}</h3>
              <p className="from">De: {selectedMessage.usuario_nombre} {selectedMessage.usuario_apellido}</p>

              <div className="message-box">
                {(() => {
                  const match = selectedMessage.comentario.match(/\[Categoría:\s(.*?)\]\n([\s\S]*)/);
                  return match ? (
                    <>
                      <strong>Categoría:</strong> {match[1]}<br/><br/>
                      {match[2]}
                    </>
                  ) : selectedMessage.comentario;
                })()}
              </div>

              {selectedMessage.estado_gestion === 'atendida' ? (
                <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px', borderLeft: '4px solid #219653' }}>
                  <h4 style={{ color: '#219653', margin: '0 0 10px 0' }}>Respuesta enviada:</h4>
                  <p style={{ margin: 0, color: '#333' }}>{selectedMessage.respuesta_coordinador}</p>
                </div>
              ) : (
                <>
                  <label className="management-label">Gestión y Respuesta</label>
                  <textarea 
                    placeholder="Escribe tu respuesta oficial aquí. Al enviar, el estado cambiará a 'atendida'..."
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                  />

                  <div className="detail-actions">
                    <button 
                      className="btn-send" 
                      onClick={handleEnviarRespuesta}
                      disabled={loading}
                    >
                      {loading ? "Enviando..." : "Enviar Respuesta"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="reports-detail card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              Selecciona un mensaje para ver los detalles
            </div>
          )}
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