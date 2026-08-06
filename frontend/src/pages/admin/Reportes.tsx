import React, { useState, useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import "../../css/ReportesComentarios.css";
import { customToast } from "../../components/custom-toast/CustomToast";
import { useAuth } from "../../context/AuthContext";
import { isLimitedToOwnLaboratories, isReadOnlyView } from "../../utils/roleGuard";
import { exportToExcel } from "../../utils/exportExcel";

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
  const readOnly = user ? isReadOnlyView(user.rol as any) : false;
  const [activeTab, setActiveTab] = useState<TabType>("uso");
  const [filter, setFilter] = useState<FilterType>("todos");
  
  const [sugerencias, setSugerencias] = useState<SugerenciaAdmin[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SugerenciaAdmin | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);

  const [mesInicio, setMesInicio] = useState("01");
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const [mesFin, setMesFin] = useState(currentMonthStr);
  const currentYear = new Date().getFullYear();
  const [anio, setAnio] = useState(String(currentYear));
  const [filtroEspacio, setFiltroEspacio] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isEspacioFilterOpen, setIsEspacioFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const espacioFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (espacioFilterRef.current && !espacioFilterRef.current.contains(event.target as Node)) {
        setIsEspacioFilterOpen(false);
      }
    };

    if (isFilterOpen || isEspacioFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen, isEspacioFilterOpen]);

  const toggleEspacio = (id: string) => {
    setFiltroEspacio(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const availableYears = React.useMemo(() => {
    const years = [];
    for (let y = currentYear + 2; y >= 2024; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

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
      const queryParams = new URLSearchParams();
      if (user?.id) queryParams.append('usuario_id', String(user.id));
      if (user?.rol) queryParams.append('rol', user.rol);

      const res = await fetch(`http://localhost:4000/api/sugerencias?${queryParams.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setSugerencias(data.data);
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

  // Obtenemos los espacios únicos de las reservas (como está originalmente)
  const espaciosUnicosDeReservas = Array.from(new Set(laboratorios.map(lab => lab.id)))
    .map(id => laboratorios.find(lab => lab.id === id)!);

  // Unimos los espacios permitidos por rol con los que vienen en el reporte
  const espaciosPermitidos = user?.rol === 'coordinador'
    ? espaciosUnicosDeReservas.filter(lab => String(lab.coordinador_id) === String(user.id))
    : espaciosUnicosDeReservas;

  const labsFiltrados = espaciosPermitidos.filter(lab => {
    if (filtroEspacio.length > 0) return filtroEspacio.includes(String(lab.id));
    return true; // Si está vacío, mostrar todos
  });

  const nombresMisLabs = React.useMemo(() => espaciosPermitidos.map(l => l.nombre), [espaciosPermitidos]);

  const horasReservadas = Math.round(labsFiltrados.reduce((acc, lab) => acc + (lab.horas_uso || 0), 0));
  const labFrecuente = labsFiltrados.length > 0 
    ? labsFiltrados.reduce((prev, curr) => (curr.total_reservas || 0) > (prev.total_reservas || 0) ? curr : prev).nombre 
    : 'N/A';

  const filteredSugerencias = React.useMemo(() => {
    return sugerencias.filter(sug => {
      // 1. Validar reglas de rol (Coordinador solo ve sugerencias de sus laboratorios)
      if (user && isLimitedToOwnLaboratories(user.rol as any)) {
        // Si la sugerencia no tiene un laboratorio asociado, o el laboratorio no es del coordinador, se oculta
        if (!sug.laboratorio_nombre || !nombresMisLabs.includes(sug.laboratorio_nombre)) {
          return false;
        }
      }

      // 2. Filtro de pestañas (todos, pendientes, respondidos)
      if (filter === "pendientes") return sug.estado_gestion === "pendiente" || sug.estado_gestion === "en_revisión";
      if (filter === "respondidos") return sug.estado_gestion === "atendida" || sug.estado_gestion === "archivada";
      
      return true; // filter === "todos"
    });
  }, [sugerencias, filter, user, nombresMisLabs]);

  // Autoseleccionar mensaje o limpiar si no aplica (solo en desktop)
  useEffect(() => {
    if (activeTab === "bandeja") {
      if (window.innerWidth > 1024) {
        if (filteredSugerencias.length > 0) {
          // Si no hay seleccionado, o el que está ya no figura en la lista, agarra el primero
          const currentIsValid = selectedMessage && filteredSugerencias.some(s => s.id === selectedMessage.id);
          if (!currentIsValid) {
            setSelectedMessage(filteredSugerencias[0]);
          }
        } else {
          setSelectedMessage(null);
        }
      } else {
        // En móviles, si la selección actual no está en la lista filtrada, limpiar
        if (selectedMessage && !filteredSugerencias.some(s => s.id === selectedMessage.id)) {
          setSelectedMessage(null);
        }
      }
    }
  }, [filteredSugerencias, activeTab]); // No poner selectedMessage aquí para no loopear

  const formatearFecha = (fechaStr: string) => {
    const f = new Date(fechaStr);
    return f.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
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
        <div className={`reports-grid ${selectedMessage ? 'show-detail' : ''}`}>
          {/* LISTA DE COMENTARIOS */}
          <div className="reports-list card">
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }} ref={filterRef}>
              <button className="reports-btn-filter" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <SlidersHorizontal size={16} />
                <span>Filtros</span>
              </button>

              {isFilterOpen && (
                <div className="reports-filter-dropdown-menu">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Filtros de Estado</span>
                    <button 
                      onClick={() => { setFilter("todos"); setIsFilterOpen(false); }}
                      style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Limpiar
                    </button>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Por Estado de Gestión</label>
                    <select 
                      className="select-report-status"
                      value={filter}
                      onChange={(e) => { setFilter(e.target.value as FilterType); setIsFilterOpen(false); }}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="todos">Todos los Estados</option>
                      <option value="pendientes">Pendientes</option>
                      <option value="respondidos">Respondidos</option>
                    </select>
                  </div>
                </div>
              )}
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
                        <div className="user-avatar">{getInitials(sug.usuario_nombre, sug.usuario_apellido)}</div>
                        <div className="user-info">
                          <div className="user">
                            <span>{sug.usuario_nombre} {sug.usuario_apellido}</span>
                            <span className="date">{formatearFecha(sug.fecha_envio)}</span>
                          </div>
                          <p className="subject">{sug.titulo}</p>
                          <p className="preview">{preview}</p>
                        </div>
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
                  <span className="tag-type">{selectedMessage.laboratorio_nombre || "General"}</span>
                  <span className={`tag-status ${selectedMessage.estado_gestion}`}>
                    {selectedMessage.estado_gestion.toUpperCase()}
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
                  <div className="response-box">
                    <h4>✓ Respuesta enviada:</h4>
                    <p>{selectedMessage.respuesta_coordinador}</p>
                  </div>
                ) : readOnly ? (
                  <div style={{ padding: '15px', marginTop: '20px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#64748b', textAlign: 'center' }}>
                    <p>Esta sugerencia está pendiente de revisión y respuesta.</p>
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
                <span>Usuarios Activos</span>
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
              <h3>Desglose por Espacio</h3>

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
                  {availableYears.map(year => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>

                <div style={{ position: 'relative' }} ref={espacioFilterRef}>
                  <button 
                    className="select-custom multi-select-btn" 
                    onClick={() => setIsEspacioFilterOpen(!isEspacioFilterOpen)}
                  >
                    {filtroEspacio.length === 0 
                      ? "Todos los espacios" 
                      : `${filtroEspacio.length} espacios seleccionados`}
                  </button>

                  {isEspacioFilterOpen && (
                    <div className="multi-select-dropdown">
                      <div className="multi-select-header">
                        <span>Selecciona Espacios</span>
                        <button className="btn-clear" onClick={() => setFiltroEspacio([])}>Limpiar</button>
                      </div>
                      <div className="multi-select-options">
                        {espaciosPermitidos.map(esp => (
                          <label key={esp.id} className="multi-select-option">
                            <input 
                              type="checkbox" 
                              checked={filtroEspacio.includes(String(esp.id))}
                              onChange={() => toggleEspacio(String(esp.id))}
                            />
                            {esp.nombre}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button className="export" onClick={() => exportToExcel(labsFiltrados, 'Reporte_Uso_Espacios')}>
                  Exportar Excel
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Espacio</th>
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
                        No hay espacios asignados a tu cuenta
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};