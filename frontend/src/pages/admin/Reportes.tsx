import React, { useState, useEffect } from "react";
import "../../css/ReportesComentarios.css";
import { customToast } from "../../components/custom-toast/CustomToast";
import { useAuth } from "../../context/AuthContext";

interface LaboratorioDB {
  id: number;
  nombre: string;
  coordinador_id?: number;
  total_reservas?: number;
  horas_uso?: number;
  estado_actual?: string;
}

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("uso");
  const [filter, setFilter] = useState<FilterType>("todos");
  
  const [sugerencias, setSugerencias] = useState<SugerenciaAdmin[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SugerenciaAdmin | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);

  const [mesInicio, setMesInicio] = useState("01");
  const [mesFin, setMesFin] = useState("06");
  const [anio, setAnio] = useState("2026");

  const [laboratorios, setLaboratorios] = useState<LaboratorioDB[]>([]);
  const [globalStats, setGlobalStats] = useState({ estudiantesActivos: 0, instrumentosPrestados: 0 });

  useEffect(() => {
    if (activeTab === "bandeja") {
      fetchSugerencias();
    } else if (activeTab === "uso") {
      fetchLaboratorios();
    }
  }, [activeTab, mesInicio, mesFin, anio]);

  const fetchLaboratorios = async () => {
    try {
      const startDate = `${anio}-${mesInicio}-01`;
      
      const nextMonth = parseInt(mesFin) === 12 ? 1 : parseInt(mesFin) + 1;
      const nextYear = parseInt(mesFin) === 12 ? parseInt(anio) + 1 : parseInt(anio);
      const endDate = new Date(new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`).getTime() - 1).toISOString().split('T')[0];

      const response = await fetch(`http://localhost:4000/api/reportes/uso-laboratorios?startDate=${startDate}&endDate=${endDate}`);
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        if (result.data.laboratorios) {
          setLaboratorios(result.data.laboratorios);
          if (result.data.globalStats) {
            setGlobalStats(result.data.globalStats);
          }
        } else {
          setLaboratorios(result.data);
        }
      }
    } catch (error) {
      console.error('Error al cargar laboratorios:', error);
    }
  };

  const fetchSugerencias = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/sugerencias");
      const data = await res.json();
      if (data.status === "success") {
        setSugerencias(data.data);
        if (data.data.length > 0 && !selectedMessage && window.innerWidth > 1024) {
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

  const labsFiltrados = laboratorios.filter(lab => user?.rol === 'coordinador' ? String(lab.coordinador_id) === String(user.id) : true);
  const horasReservadas = labsFiltrados.reduce((acc, lab) => acc + (lab.horas_uso || 0), 0);
  const labFrecuente = labsFiltrados.length > 0 
    ? labsFiltrados.reduce((prev, curr) => (curr.total_reservas || 0) > (prev.total_reservas || 0) ? curr : prev).nombre 
    : 'N/A';

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
        <div className={`reports-grid ${selectedMessage ? 'show-detail' : ''}`}>
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

            <div className="messages-list-container">
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
          <div className="reports-detail card">
            {selectedMessage ? (
              <>
                <button 
                  className="mobile-back-btn" 
                  onClick={() => setSelectedMessage(null)}
                >
                  ← Volver a la lista
                </button>
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
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
              Selecciona un mensaje para ver los detalles
            </div>
          )}
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
                <h3>{horasReservadas} h</h3>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon circle-green">🧪</div>
              <div className="stat-text">
                <span>Lab. Más Frecuente</span>
                <h3>{labFrecuente}</h3>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon circle-orange">👥</div>
              <div className="stat-text">
                <span>Estudiantes Activos</span>
                <h3>{globalStats.estudiantesActivos}</h3>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon circle-purple">📅</div>
              <div className="stat-text">
                <span>Instrumentos Prestados</span>
                <h3>{globalStats.instrumentosPrestados}</h3>
              </div>
            </div>
          </div>

          {/* TABLA DE DESGLOSE */}
          <div className="table-section">
            <div className="table-header">
              <h3>Desglose por Laboratorio</h3>

              <div className="table-actions">
                <select className="select-custom" value={mesInicio} onChange={e => setMesInicio(e.target.value)}>
                  <option value="01">Enero</option>
                  <option value="02">Febrero</option>
                  <option value="03">Marzo</option>
                  <option value="04">Abril</option>
                  <option value="05">Mayo</option>
                  <option value="06">Junio</option>
                  <option value="07">Julio</option>
                  <option value="08">Agosto</option>
                  <option value="09">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
                <span className="separator">-</span>
                <select className="select-custom" value={mesFin} onChange={e => setMesFin(e.target.value)}>
                  <option value="01">Enero</option>
                  <option value="02">Febrero</option>
                  <option value="03">Marzo</option>
                  <option value="04">Abril</option>
                  <option value="05">Mayo</option>
                  <option value="06">Junio</option>
                  <option value="07">Julio</option>
                  <option value="08">Agosto</option>
                  <option value="09">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
                <select className="select-custom year-select" value={anio} onChange={e => setAnio(e.target.value)}>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
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
                {labsFiltrados.map(lab => (
                    <tr key={lab.id}>
                      <td>{lab.nombre}</td>
                      <td>{lab.total_reservas || 0}</td>
                      <td>{lab.horas_uso || 0} h</td>
                      <td className="status-cell">
                        <span className={
                          lab.estado_actual === 'Mantenimiento' ? 'status-warn' :
                          lab.estado_actual === 'Ocupado' ? 'status-busy' : 'status-ok'
                        }>
                          {lab.estado_actual || 'Operativo'}
                        </span>
                      </td>
                    </tr>
                  ))
                }
                {labsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                      No hay laboratorios asignados a tu cuenta
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};