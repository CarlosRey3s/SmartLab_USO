import { useState, useEffect } from 'react';
import { Search, Plus, X, Monitor, Building2 } from 'lucide-react';
import '../../css/ModalNuevaActividad.css';

type TipoActividad = "clase" | "mantenimiento" | "reserva" | null;
type ModoReserva = "por_estacion" | "espacio_completo";
type EstadoEstacion = "disponible" | "no_disponible";

interface LaboratorioDB {
  id: number;
  nombre: string;
  modo_reserva: ModoReserva;
  capacidad_maxima?: number;
}

// Estaciones ahora incluyen estado y capacidad (según estaciones_trabajo en la BD)
interface EstacionDB {
  id: number;
  numero: string; // O el campo que tu backend devuelva para nombrar la estación
  estado: EstadoEstacion;
  capacidad?: number;
}

interface NuevaActividadProps {
  onClose: () => void;
  onGuardar: (data: any) => void;
}

interface FormData {
  tipo: TipoActividad;
  // Clase
  materia?: string;
  docente?: string;
  // Mantenimiento
  responsable?: string;
  descripcion?: string;
  // Reserva
  titulo?: string;
  estaciones?: (number | string)[]; // ahora es multi-selección
  equipos?: EquipoSeleccionado[];
  // Compartidos
  laboratorio?: string;
  numPersonas?: number;
  fecha?: string;
  desde?: string;
  hasta?: string;
  recurrencia?: string;
}

// ── Inventario ──────────────────────────────────────────
interface ItemInventarioDB {
  id: number;
  laboratorio_id: number;
  nombre: string;
  cantidad_actual: number;
}

interface EquipoSeleccionado {
  id: number | string;
  nombre: string;
  disponibles: number;
  cantidad?: number;
}

function badgeClass(disponibles: number) {
  if (disponibles === 0) return "inv-badge-no";
  if (disponibles <= 2) return "inv-badge-lim";
  return "inv-badge-ok";
}

function badgeLabel(disponibles: number) {
  if (disponibles === 0) return "No disponible";
  if (disponibles <= 2) return `Stock bajo (${disponibles})`;
  return `Disponible (${disponibles})`;
}
// ────────────────────────────────────────────────────────

const RECURRENCIA_CLASE = [
  "No se repite",
  "Todos los días",
  "Cada semana, el lunes",
  "Todos los días hábiles (lunes a viernes)",
  "Todos los meses",
  "Personalizado...",
];

const RECURRENCIA_SIMPLE = [
  "No se repite",
  "Todos los días",
  "Cada semana",
  "Personalizado...",
];

const FOOTER_TIPS: Record<string, string> = {
  clase: "Los campos marcados son obligatorios · La recurrencia aplica a todas las semanas del ciclo",
  mantenimiento: "El laboratorio quedará bloqueado en ese horario para todos los estudiantes",
  reserva: "La reserva directa no requiere aprobación y se confirma inmediatamente",
};

const HEADER_SUBS: Record<string, string> = {
  clase: "Clase regular con docente y horario asignado",
  mantenimiento: "Cierre técnico del laboratorio",
  reserva: "Reserva directa sin pasar por solicitud",
};

const TIPO_LABEL: Record<string, string> = {
  clase: "Clase regular",
  mantenimiento: "Cierre técnico",
  reserva: "Reserva directa",
};

// ── Pasos por tipo de actividad ──────────────────────────
// clase y mantenimiento no usan estación individual (no existe esa
// relación en clases_academicas ni en mantenimientos, solo en
// reservas_estudiantes), así que su paso "laboratorio" no muestra el mapa.
const STEPS: Record<Exclude<TipoActividad, null>, string[]> = {
  clase: ["datos", "laboratorio", "instrumentos", "horario"],
  mantenimiento: ["datos", "laboratorio", "horario"],
  reserva: ["datos", "laboratorio", "instrumentos", "horario"],
};

const STEP_TITLES: Record<string, Partial<Record<Exclude<TipoActividad, null>, string>>> = {
  datos: { clase: "Datos de la clase", mantenimiento: "Datos del mantenimiento", reserva: "Datos de la reserva" },
  laboratorio: { clase: "Laboratorio", mantenimiento: "Laboratorio", reserva: "Laboratorio y estación" },
  instrumentos: { clase: "Instrumentos", reserva: "Instrumentos" },
  horario: { clase: "Fecha y hora", mantenimiento: "Fecha y hora", reserva: "Fecha y hora" },
};

export function ModalNuevaActividad({ onClose, onGuardar }: NuevaActividadProps) {
  // ── Estados para llamadas a BD ──
  const [labsDesdeBD, setLabsDesdeBD] = useState<LaboratorioDB[]>([]);
  const [cargandoLabs, setCargandoLabs] = useState(true);

  const [estacionesDesdeBD, setEstacionesDesdeBD] = useState<EstacionDB[]>([]);
  const [cargandoEstaciones, setCargandoEstaciones] = useState(false);

  const [inventarioDesdeBD, setInventarioDesdeBD] = useState<ItemInventarioDB[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);

  // 1. Efecto para cargar los laboratorios al inicio
  useEffect(() => {
    const fetchlaboratorios = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/laboratorios');
        const result = await response.json();

        if (result.success || result.data) {
          setLabsDesdeBD(result.data || result);
        } else if (Array.isArray(result)) {
          setLabsDesdeBD(result);
        }
      } catch (error) {
        console.error('Error al cargar laboratorios:', error);
      } finally {
        setCargandoLabs(false);
      }
    };
    fetchlaboratorios();
  }, []);

  // Efecto para cargar el inventario completo
  useEffect(() => {
    const fetchInventario = async () => {
      setCargandoInventario(true);
      try {
        const response = await fetch('http://localhost:4000/api/inventario');
        const result = await response.json();

        if (result.success || result.data) {
          setInventarioDesdeBD(result.data || result);
        } else if (Array.isArray(result)) {
          setInventarioDesdeBD(result);
        }
      } catch (error) {
        console.error('Error al cargar inventario:', error);
      } finally {
        setCargandoInventario(false);
      }
    };
    fetchInventario();
  }, []);

  const [tipo, setTipo] = useState<TipoActividad>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormData>({
    tipo: null,
    numPersonas: 20,
    recurrencia: "No se repite",
    equipos: [],
    estaciones: [],
  });

  // 2. Efecto para cargar estaciones dependientes del laboratorio seleccionado
  useEffect(() => {
    if (!form.laboratorio) {
      setEstacionesDesdeBD([]);
      return;
    }

    const fetchEstaciones = async () => {
      setCargandoEstaciones(true);
      try {
        const response = await fetch(`http://localhost:4000/api/laboratorios/${form.laboratorio}/estaciones`);
        const result = await response.json();

        if (result.success || result.data) {
          setEstacionesDesdeBD(result.data || result);
        } else if (Array.isArray(result)) {
          setEstacionesDesdeBD(result);
        }
      } catch (error) {
        console.error(`Error al cargar estaciones del lab ${form.laboratorio}:`, error);
      } finally {
        setCargandoEstaciones(false);
      }
    };

    fetchEstaciones();
  }, [form.laboratorio]);

  // ── Inventario state ──
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const equiposSeleccionados: EquipoSeleccionado[] = form.equipos || [];
  const estacionesSeleccionadas: (number | string)[] = form.estaciones || [];

  const resultados = !form.laboratorio ? [] : inventarioDesdeBD
    .filter(
      (e) =>
        e.laboratorio_id?.toString() === form.laboratorio?.toString() &&
        (query.trim() === "" || e.nombre.toLowerCase().includes(query.toLowerCase())) &&
        !equiposSeleccionados.find((s) => s.id === e.id)
    )
    .map((e) => ({
      id: e.id,
      nombre: e.nombre,
      disponibles: e.cantidad_actual
    }));

  const agregarEquipo = (equipo: EquipoSeleccionado) => {
    setForm((prev) => ({
      ...prev,
      equipos: [
        ...(prev.equipos || []),
        { ...equipo, cantidad: 1 }
      ]
    }));
    setQuery("");
    setShowResults(false);
  };

  const quitarEquipo = (id: string | number) => {
    setForm((prev) => ({
      ...prev,
      equipos: (prev.equipos || []).filter((e) => e.id !== id)
    }));
  };

  const aumentarCantidad = (id: string | number) => {
    setForm((prev) => ({
      ...prev,
      equipos: (prev.equipos || []).map((equipo) => {
        if (equipo.id !== id) return equipo;
        const cantidadActual = equipo.cantidad ?? 1;
        return {
          ...equipo,
          cantidad: cantidadActual < equipo.disponibles ? cantidadActual + 1 : cantidadActual,
        };
      }),
    }));
  };

  const disminuirCantidad = (id: string | number) => {
    setForm((prev) => ({
      ...prev,
      equipos: (prev.equipos || []).map((equipo) => {
        if (equipo.id !== id) return equipo;
        const cantidadActual = equipo.cantidad ?? 1;
        return {
          ...equipo,
          cantidad: cantidadActual > 1 ? cantidadActual - 1 : 1,
        };
      }),
    }));
  };

  // Selección múltiple de estaciones (solo aplica a reserva + modo por_estacion)
  const toggleEstacion = (id: number | string) => {
    setForm((prev) => {
      const actuales = prev.estaciones || [];
      const yaSeleccionada = actuales.includes(id);
      return {
        ...prev,
        estaciones: yaSeleccionada ? actuales.filter((e) => e !== id) : [...actuales, id],
      };
    });
  };
  // ─────────────────────

  const set = (field: keyof FormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleTipo = (t: TipoActividad) => {
    setTipo(t);
    setStepIndex(0);
    setForm({
      tipo: t,
      numPersonas: t === "clase" ? 20 : 3,
      recurrencia: "No se repite",
      equipos: [],
      estaciones: [],
      desde: t === "clase" ? "08:00" : t === "mantenimiento" ? "14:00" : "09:00",
      hasta: t === "clase" ? "10:00" : t === "mantenimiento" ? "17:00" : "11:00",
    });
    setQuery("");
  };

  const steps = tipo ? STEPS[tipo] : [];
  const currentStepKey = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const laboratorioSeleccionado = labsDesdeBD.find((l) => l.id.toString() === form.laboratorio?.toString());
  const modoReserva: ModoReserva = laboratorioSeleccionado?.modo_reserva || "por_estacion";

  const handleAtras = () => {
    if (stepIndex === 0) {
      setTipo(null);
      setForm({ tipo: null, numPersonas: 20, recurrencia: "No se repite", equipos: [], estaciones: [] });
    } else {
      setStepIndex((i) => i - 1);
    }
  };

  const handleGuardar = () => {
    onGuardar({ ...form, tipo });
    onClose();
  };

  const handleSiguiente = () => {
    if (isLastStep) {
      handleGuardar();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const canAvanzar = (): boolean => {
    if (!tipo) return false;
    if (currentStepKey === "datos") {
      if (tipo === "clase") return !!form.materia && !!form.docente;
      if (tipo === "mantenimiento") return !!form.responsable && !!form.descripcion;
      if (tipo === "reserva") return !!form.titulo;
    }
    if (currentStepKey === "laboratorio") {
      if (!form.laboratorio) return false;
      if (tipo === "reserva" && modoReserva === "por_estacion") return estacionesSeleccionadas.length > 0;
    }
    if (currentStepKey === "horario") return !!form.fecha;
    return true;
  };

  return (
    <div className="na-overlay">
      <div className="na-modal">

        {/* Header */}
        <div className="na-header">
          <div>
            <div className="na-header-title">Nueva Actividad</div>
            <div className="na-header-sub">
              {tipo ? HEADER_SUBS[tipo] : "Selecciona el tipo de actividad para continuar"}
            </div>
          </div>
          <button className="na-close" onClick={onClose}>×</button>
        </div>

        {/* Progreso por pasos (solo una vez elegido el tipo) */}
        {tipo && (
          <div className="na-progress">
            <div className="na-progress-dots">
              {steps.map((s, i) => (
                <span key={s} className={`na-dot ${i <= stepIndex ? "na-dot-on" : ""}`} />
              ))}
            </div>
            <div className="na-progress-label">
              Paso {stepIndex + 1} de {steps.length} · {STEP_TITLES[currentStepKey]?.[tipo]}
            </div>
          </div>
        )}

        <div className="na-body">

          {/* ── SELECCIÓN DE TIPO (pantalla inicial, sin más campos) ── */}
          {!tipo && (
            <>
              <div className="na-field-label">TIPO DE ACTIVIDAD</div>
              <div className="na-tipo-selector">
                <button className="na-tipo-btn na-tipo-clase" onClick={() => handleTipo("clase")}>
                  <div className="na-tipo-ico na-ico-clase"><CalendarIcon color="#0F6E56" /></div>
                  <div className="na-tipo-name">Clase regular</div>
                  <div className="na-tipo-desc">Clase con docente asignado</div>
                </button>

                <button className="na-tipo-btn na-tipo-mant" onClick={() => handleTipo("mantenimiento")}>
                  <div className="na-tipo-ico na-ico-mant"><WrenchIcon color="#A32D2D" /></div>
                  <div className="na-tipo-name">Cierre técnico</div>
                  <div className="na-tipo-desc">Cierre técnico del laboratorio</div>
                </button>

                <button className="na-tipo-btn na-tipo-res" onClick={() => handleTipo("reserva")}>
                  <div className="na-tipo-ico na-ico-res"><UserIcon color="#854F0B" /></div>
                  <div className="na-tipo-name">Reserva directa</div>
                  <div className="na-tipo-desc">Reserva manual del admin</div>
                </button>
              </div>
            </>
          )}

          {/* ── PASO: DATOS ── */}
          {tipo === "clase" && currentStepKey === "datos" && (
            <div className="na-fields">
              <div className="na-row2">
                <div className="na-field-group">
                  <label className="na-field-label">MATERIA / TÍTULO</label>
                  <input className="na-input" placeholder="Ej: Física I, Electrónica Digital..." value={form.materia || ""} onChange={(e) => set("materia", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">DOCENTE</label>
                  <input className="na-input" placeholder="Nombre del profesor" value={form.docente || ""} onChange={(e) => set("docente", e.target.value)} />
                </div>
              </div>
              <div className="na-field-group">
                <label className="na-field-label">N° DE ESTUDIANTES</label>
                <div className="na-num-row">
                  <button className="na-num-btn" onClick={() => set("numPersonas", Math.max(1, (form.numPersonas || 1) - 1))}>−</button>
                  <span className="na-num-val">{form.numPersonas}</span>
                  <button className="na-num-btn" onClick={() => set("numPersonas", (form.numPersonas || 0) + 1)}>+</button>
                </div>
              </div>
            </div>
          )}

          {tipo === "mantenimiento" && currentStepKey === "datos" && (
            <div className="na-fields">
              <div className="na-field-group">
                <label className="na-field-label">RESPONSABLE TÉCNICO</label>
                <input className="na-input" placeholder="Nombre del técnico" value={form.responsable || ""} onChange={(e) => set("responsable", e.target.value)} />
              </div>
              <div className="na-field-group">
                <label className="na-field-label">DESCRIPCIÓN DEL TRABAJO</label>
                <textarea className="na-textarea" placeholder="Ej: Revisión general de equipos, cambio de fuente de poder #3..." value={form.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} />
              </div>
            </div>
          )}

          {tipo === "reserva" && currentStepKey === "datos" && (
            <div className="na-fields">
              <div className="na-field-group">
                <label className="na-field-label">TÍTULO / MOTIVO</label>
                <input className="na-input" placeholder="Ej: Demostración para visita académica, Práctica docente..." value={form.titulo || ""} onChange={(e) => set("titulo", e.target.value)} />
              </div>
            </div>
          )}

          {/* ── PASO: LABORATORIO (y estación, solo para reserva) ── */}
          {currentStepKey === "laboratorio" && tipo && (
            <div className="na-fields">
              <div className="na-field-group">
                <label className="na-field-label">LABORATORIO</label>
                <select
                  className="na-select"
                  value={form.laboratorio || ""}
                  onChange={(e) => { set("laboratorio", e.target.value); set("estaciones" as keyof FormData, [] as any); }}
                  disabled={cargandoLabs}
                >
                  <option value="">{cargandoLabs ? "Cargando laboratorios..." : "Selecciona un laboratorio"}</option>
                  {labsDesdeBD.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.nombre}</option>
                  ))}
                </select>
              </div>

              {tipo === "clase" && (
                <div className="na-field-group">
                  <label className="na-field-label">N° DE ESTUDIANTES</label>
                  <div className="na-num-row">
                    <button className="na-num-btn" onClick={() => set("numPersonas", Math.max(1, (form.numPersonas || 1) - 1))}>−</button>
                    <span className="na-num-val">{form.numPersonas}</span>
                    <button className="na-num-btn" onClick={() => set("numPersonas", (form.numPersonas || 0) + 1)}>+</button>
                  </div>
                </div>
              )}

              {tipo === "reserva" && form.laboratorio && (
                <>
                  <div className="na-field-group">
                    <label className="na-field-label">N° DE PERSONAS</label>
                    <div className="na-num-row">
                      <button className="na-num-btn" onClick={() => set("numPersonas", Math.max(1, (form.numPersonas || 1) - 1))}>−</button>
                      <span className="na-num-val">{form.numPersonas}</span>
                      <button className="na-num-btn" onClick={() => set("numPersonas", (form.numPersonas || 0) + 1)}>+</button>
                    </div>
                  </div>

                  {modoReserva === "por_estacion" ? (
                    <div className="na-field-group">
                      <label className="na-field-label">ESTACIÓN DE TRABAJO · puedes elegir una o varias</label>
                      {cargandoEstaciones ? (
                        <div className="na-hint">Cargando estaciones...</div>
                      ) : (
                        <div className="na-estaciones-legend">
                          <span className="na-leg-item"><span className="na-leg-dot na-leg-disp" />Disponible</span>
                          <span className="na-leg-item"><span className="na-leg-dot na-leg-sel" />Seleccionada</span>
                          <span className="na-leg-item"><span className="na-leg-dot na-leg-no" />No disponible</span>
                        </div>
                      )}
                      <div className="na-estaciones-grid">
                        {estacionesDesdeBD.map((est) => {
                          const seleccionada = estacionesSeleccionadas.includes(est.id);
                          const noDisponible = est.estado === "no_disponible";
                          const clase = noDisponible
                            ? "na-estacion-btn na-estacion-no"
                            : seleccionada
                              ? "na-estacion-btn na-estacion-sel"
                              : "na-estacion-btn";
                          return (
                            <button
                              key={est.id}
                              type="button"
                              className={clase}
                              disabled={noDisponible}
                              onClick={() => toggleEstacion(est.id)}
                            >
                              <Monitor size={14} />
                              {est.numero}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="na-full-lab-card">
                      <Building2 size={26} />
                      <div className="na-full-lab-title">Espacio completo</div>
                      <div className="na-full-lab-desc">
                        Este laboratorio se reserva entero, sin estaciones individuales
                        {laboratorioSeleccionado?.capacidad_maxima ? ` · capacidad ${laboratorioSeleccionado.capacidad_maxima} personas` : ""}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tipo === "mantenimiento" && (
                <div className="na-hint">Este tipo de actividad bloquea el laboratorio completo, no requiere seleccionar estación.</div>
              )}
            </div>
          )}

          {/* ── PASO: INSTRUMENTOS (clase y reserva) ── */}
          {currentStepKey === "instrumentos" && (tipo === "clase" || tipo === "reserva") && (
            <div className="na-fields">
              <div className="na-field-group">
                <div className="inv-search-wrapper">
                  <Search size={14} className="inv-search-icon" />
                  <input
                    className="na-input inv-search-input"
                    type="text"
                    placeholder="Buscar equipo o activo..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 150)}
                  />

                  {showResults && resultados.length > 0 && (
                    <ul className="inv-results">
                      {resultados.map((equipo) => (
                        <li
                          key={equipo.id}
                          className="inv-result-item"
                          onMouseDown={() => agregarEquipo(equipo)}
                        >
                          <span className="inv-result-nombre">{equipo.nombre}</span>
                          <span className={`inv-result-badge ${badgeClass(equipo.disponibles)}`}>
                            {badgeLabel(equipo.disponibles)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {equiposSeleccionados.length > 0 && (
                  <ul className="inv-selected-list">
                    {equiposSeleccionados.map((equipo) => (
                      <li key={equipo.id} className="inv-selected-item">
                        <div className="inv-selected-info">
                          <span className="inv-selected-nombre">{equipo.nombre}</span>
                          <span className={`inv-result-badge ${badgeClass(equipo.disponibles)}`}>
                            {badgeLabel(equipo.disponibles)}
                          </span>
                        </div>
                        <div className="inv-selected-actions">
                          <div className="inv-cantidad-wrapper">
                            <span className="inv-cantidad-label">Cantidad</span>
                            <div className="inv-cantidad">
                              <button type="button" onClick={() => disminuirCantidad(equipo.id)} disabled={(equipo.cantidad || 1) <= 1}>−</button>
                              <span>{equipo.cantidad || 1}</span>
                              <button type="button" onClick={() => aumentarCantidad(equipo.id)} disabled={(equipo.cantidad || 1) >= equipo.disponibles}>+</button>
                            </div>
                          </div>
                          <button type="button" className="inv-quitar-btn" onClick={() => quitarEquipo(equipo.id)}>
                            <X size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <button type="button" className="inv-add-btn" onClick={() => setShowResults(true)}>
                  <Plus size={13} />
                  Añadir ítem
                </button>
              </div>
            </div>
          )}

          {/* ── PASO: FECHA, HORA Y RESUMEN ── */}
          {currentStepKey === "horario" && tipo && (
            <div className="na-fields">
              <div className="na-row3">
                <div className="na-field-group">
                  <label className="na-field-label">FECHA</label>
                  <input className="na-input" type="date" value={form.fecha || ""} onChange={(e) => set("fecha", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">DESDE</label>
                  <input className="na-input" type="time" value={form.desde || ""} onChange={(e) => set("desde", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">HASTA</label>
                  <input className="na-input" type="time" value={form.hasta || ""} onChange={(e) => set("hasta", e.target.value)} />
                </div>
              </div>
              <div className="na-field-group">
                <label className="na-field-label">RECURRENCIA</label>
                <div className="na-recur-row">
                  <RecurIcon />
                  <select className="na-select na-recur-select" value={form.recurrencia || ""} onChange={(e) => set("recurrencia", e.target.value)}>
                    {(tipo === "clase" ? RECURRENCIA_CLASE : RECURRENCIA_SIMPLE).map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="na-resumen-card">
                <div className="na-resumen-line">
                  {TIPO_LABEL[tipo]} · {laboratorioSeleccionado?.nombre || "sin laboratorio"}
                  {tipo === "reserva" && modoReserva === "por_estacion"
                    ? ` · ${estacionesSeleccionadas.length} estación${estacionesSeleccionadas.length === 1 ? "" : "es"}`
                    : ""}
                </div>
                {tipo === "reserva" && (
                  <div className="na-resumen-note">Se guardará como reserva aprobada automáticamente.</div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="na-footer">
          <div className="na-footer-tip">
            {tipo ? FOOTER_TIPS[tipo] : "Selecciona un tipo para continuar"}
          </div>
          <div className="na-footer-btns">
            {tipo ? (
              <>
                <button className="na-btn-cancel" onClick={handleAtras}>
                  {stepIndex === 0 ? "Cambiar tipo" : "Atrás"}
                </button>
                <button
                  className={`na-btn-save ${tipo === "mantenimiento" ? "na-btn-save-mant" : ""}`}
                  onClick={handleSiguiente}
                  disabled={!canAvanzar()}
                >
                  {isLastStep ? "Guardar actividad" : "Siguiente"}
                </button>
              </>
            ) : (
              <button className="na-btn-cancel" onClick={onClose}>Cancelar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Íconos inline ── */
function CalendarIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 3V2M11 3V2M2 7h12" />
    </svg>
  );
}
function WrenchIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M13.5 2.5l-2 2-1.5-1.5 2-2a3 3 0 00-3.8 3.8L2.5 10.5a1.5 1.5 0 002 2l5.7-5.7a3 3 0 003.3-4.3z" />
    </svg>
  );
}
function UserIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5">
      <circle cx="8" cy="6" r="3" />
      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" />
    </svg>
  );
}
function RecurIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, color: "#888" }}>
      <path d="M2 8a6 6 0 016-6 6 6 0 014.5 2M14 8a6 6 0 01-6 6 6 6 0 01-4.5-2" />
      <path d="M12 2l2.5 2L12 6M4 10l-2.5 2L4 14" />
    </svg>
  );
}