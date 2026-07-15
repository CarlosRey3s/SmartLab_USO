import { useState, useEffect } from 'react';
import { Search, Plus, X, Monitor, Building2, Grid } from 'lucide-react';
import Select from 'react-select';
import { usuariosService } from '../../services/usuarios.service';
import { chequearDisponibilidad } from '../../services/actividades.service';
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
  nombre?: string;
  estado: EstadoEstacion;
  capacidad?: number;
}

interface NuevaActividadProps {
  onClose: () => void;
  onGuardar: (data: any) => void;
  actividadExistente?: any; // Para editar, si es necesario
}

interface FormData {
  tipo: TipoActividad;
  // Clase
  materia?: string;
  docente?: string | number;
  // Mantenimiento
  responsable?: string | number;
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
  clase: ["datos", "horario", "laboratorio", "instrumentos"],
  mantenimiento: ["datos", "horario", "laboratorio"],
  reserva: ["datos", "horario", "laboratorio", "instrumentos"],
};

// Etiquetas cortas para el stepper numerado (debajo de cada círculo)
const STEP_SHORT_LABELS: Record<string, string> = {
  datos: "General",
  laboratorio: "Espacio",
  instrumentos: "Equipos",
  horario: "Fecha y hora",
};

export function ModalNuevaActividad({ onClose, onGuardar, actividadExistente }: NuevaActividadProps) {
  // ── Estados para llamadas a BD ──
  const [labsDesdeBD, setLabsDesdeBD] = useState<LaboratorioDB[]>([]);
  const [cargandoLabs, setCargandoLabs] = useState(true);

  const [estacionesDesdeBD, setEstacionesDesdeBD] = useState<EstacionDB[]>([]);
  const [cargandoEstaciones, setCargandoEstaciones] = useState(false);

  const [inventarioDesdeBD, setInventarioDesdeBD] = useState<ItemInventarioDB[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);

  // ── EFECTO PARA MODO EDICIÓN ──
  useEffect(() => {
    if (actividadExistente) {
      // 1. Convertir los objetos Date a formato de input (YYYY-MM-DD y HH:mm)
      const start = new Date(actividadExistente.start);
      const end = new Date(actividadExistente.end);

      // Usamos métodos locales para evitar saltos de zona horaria
      const fechaLocal = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const desdeLocal = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      const hastaLocal = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

      // 2. Establecer el tipo principal
      setTipo(actividadExistente.tipo);

      // 3. Rellenar el formulario con todos los campos correspondientes a la BD
      setForm({
        tipo: actividadExistente.tipo,
        laboratorio: actividadExistente.laboratorio_id ? actividadExistente.laboratorio_id.toString() : "",
        fecha: fechaLocal,
        desde: desdeLocal,
        hasta: hastaLocal,
        recurrencia: actividadExistente.recurrencia || "No se repite",

        // Datos específicos de Clase
        materia: actividadExistente.materia || "",
        docente: actividadExistente.docente_id || "",
        numPersonas: actividadExistente.clase_estudiantes || 20,

        // Datos específicos de Mantenimiento
        responsable: actividadExistente.tecnico_responsable || "",
        descripcion: actividadExistente.mant_descripcion || actividadExistente.reserva_nota || "",

        // Datos específicos de Reserva
        titulo: actividadExistente.reserva_titulo || "",
        estaciones: actividadExistente.estaciones ? actividadExistente.estaciones.map((e: any) => Number(e)) : [],

        equipos: [] // Si luego habilitas edición de equipos, aquí iría el mapeo
      });
    }
  }, [actividadExistente]);

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

  const [estacionesOcupadas, setEstacionesOcupadas] = useState<number[]>([]);
  const [bloqueoTotal, setBloqueoTotal] = useState<boolean>(false);
  const [verificando, setVerificando] = useState<boolean>(false);
  const [mostrarSoloDisponibles, setMostrarSoloDisponibles] = useState<boolean>(false);

  useEffect(() => {
    const verificar = async () => {
      if (form.laboratorio && form.fecha && form.desde && form.hasta) {
        setVerificando(true);
        try {
          const result = await chequearDisponibilidad(
            parseInt(form.laboratorio),
            form.fecha,
            form.desde,
            form.hasta,
            actividadExistente?.id
          );

          if (result) {
            setBloqueoTotal(result.bloqueoTotal);
            setEstacionesOcupadas(result.estacionesOcupadas || []);

            if (result.estacionesOcupadas && result.estacionesOcupadas.length > 0) {
              setForm(prev => ({
                ...prev,
                estaciones: (prev.estaciones || []).filter(id => !result.estacionesOcupadas.includes(typeof id === 'string' ? parseInt(id) : id))
              }));
            }
          }
        } catch (error) {
          console.error("Error validando disponibilidad", error);
        } finally {
          setVerificando(false);
        }
      } else {
        setBloqueoTotal(false);
        setEstacionesOcupadas([]);
      }
    };

    const timeoutId = setTimeout(() => verificar(), 500);
    return () => clearTimeout(timeoutId);
  }, [form.laboratorio, form.fecha, form.desde, form.hasta, actividadExistente]);

  const [tecnicosOptions, setTecnicosOptions] = useState<{ value: number, label: string }[]>([]);
  const [docentesOptions, setDocentesOptions] = useState<{ value: number, label: string }[]>([]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await usuariosService.getUsuarios();
        const usuarios = Array.isArray(data) ? data : data.data || [];

        // Filtrar y mapear técnicos
        const tecnicos = usuarios.filter((u: any) =>
          u.rol === 'técnico' || u.rol === 'tecnico' || u.rol === 'Técnico' || u.rol === 'Tecnico'
        );
        const optionsT = tecnicos.map((t: any) => ({
          value: t.id,
          label: `${t.nombre} ${t.apellido || ''}`.trim()
        }));
        setTecnicosOptions(optionsT);

        // Filtrar y mapear docentes
        const docentes = usuarios.filter((u: any) =>
          u.rol === 'docente' || u.rol === 'Docente' || u.rol === 'DOCENTE'
        );
        const optionsD = docentes.map((d: any) => ({
          value: d.id,
          label: `${d.nombre} ${d.apellido || ''}`.trim()
        }));
        setDocentesOptions(optionsD);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      }
    };
    fetchUsuarios();
  }, []);

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
  // Normalizamos siempre a number para evitar mezclas string/number que
  // provocaban que una estación ya seleccionada no se reconociera como tal
  // (y terminara duplicada al guardar).
  const toggleEstacion = (id: number | string) => {
    const idNum = Number(id);
    setForm((prev) => {
      const actuales = (prev.estaciones || []).map(Number);
      const yaSeleccionada = actuales.includes(idNum);
      return {
        ...prev,
        estaciones: yaSeleccionada ? actuales.filter((e) => e !== idNum) : [...actuales, idNum],
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

  const canSave = canAvanzar();

  return (
    <div className="na-overlay">
      <div className="na-modal">

        {/* Header */}
        <div className="na-header">
          <div>
            <div className="na-header-title">{actividadExistente ? "Editar Actividad" : "Nueva Actividad"}</div>
            <div className="na-header-sub">
              {tipo ? HEADER_SUBS[tipo] : "Selecciona el tipo de actividad para continuar"}
            </div>
          </div>
          <button className="na-close" onClick={onClose}>×</button>
        </div>

        {/* Progreso por pasos (solo una vez elegido el tipo) */}
        {tipo && (
          <div className="na-stepper">
            {steps.map((s, i) => {
              const isDone = i < stepIndex;
              const isActive = i === stepIndex;
              return (
                <div className="na-stepper-item" key={s}>
                  <div className="na-stepper-node">
                    <div className={`na-stepper-circle ${isActive || isDone ? "na-stepper-circle-on" : ""}`}>
                      {i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`na-stepper-line ${isDone ? "na-stepper-line-on" : ""}`} />
                    )}
                  </div>
                  <div className={`na-stepper-label ${isActive || isDone ? "na-stepper-label-on" : ""}`}>
                    {STEP_SHORT_LABELS[s]}
                  </div>
                </div>
              );
            })}
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
                  <Select
                    placeholder="Buscar docente..."
                    options={docentesOptions}
                    value={docentesOptions.find(opt => opt.value === form.docente) || null}
                    onChange={(selected: any) => set("docente", selected ? selected.value : "")}
                    noOptionsMessage={() => "No se encontraron docentes"}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        backgroundColor: '#f8fafc',
                        borderColor: state.isFocused ? '#1a3a34' : '#e2e8f0',
                        borderWidth: '1.5px',
                        borderRadius: '8px',
                        boxShadow: 'none',
                        minHeight: '38px',
                        fontSize: '13px',
                        '&:hover': {
                          borderColor: state.isFocused ? '#1a3a34' : '#cbd5e1'
                        }
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        zIndex: 9999,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? '#e2e8f0' : state.isFocused ? '#f1f5f9' : '#ffffff',
                        color: '#1a1a1a',
                        cursor: 'pointer',
                        '&:active': {
                          backgroundColor: '#cbd5e1'
                        }
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: '#1a1a1a'
                      }),
                      input: (base) => ({
                        ...base,
                        color: '#1a1a1a'
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#aaa'
                      })
                    }}
                  />
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
                <Select
                  placeholder="Buscar técnico..."
                  options={tecnicosOptions}
                  value={tecnicosOptions.find(opt => opt.value === form.responsable) || null}
                  onChange={(selected: any) => set("responsable", selected ? selected.value : "")}
                  noOptionsMessage={() => "No se encontraron técnicos"}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: '#f8fafc',
                      borderColor: state.isFocused ? '#1a3a34' : '#e2e8f0',
                      borderWidth: '1.5px',
                      borderRadius: '8px',
                      boxShadow: 'none',
                      minHeight: '38px',
                      fontSize: '13px',
                      '&:hover': {
                        borderColor: state.isFocused ? '#1a3a34' : '#cbd5e1'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      zIndex: 9999,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#e2e8f0' : state.isFocused ? '#f1f5f9' : '#ffffff',
                      color: '#1a1a1a',
                      cursor: 'pointer',
                      '&:active': {
                        backgroundColor: '#cbd5e1'
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: '#1a1a1a'
                    }),
                    input: (base) => ({
                      ...base,
                      color: '#1a1a1a'
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: '#aaa'
                    })
                  }}
                />
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
                      <div className="na-field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ESTACIÓN DE TRABAJO · puedes elegir una o varias</span>
                        {estacionesSeleccionadas.length > 0 && (
                          <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '13px', textTransform: 'none' }}>
                            {estacionesSeleccionadas.length} seleccionadas
                          </span>
                        )}
                      </div>
                      {cargandoEstaciones ? (
                        <div className="na-hint">Cargando estaciones...</div>
                      ) : (
                        <>
                          <div className="na-estaciones-legend">
                            <span className="na-leg-item"><span className="na-leg-square na-leg-disp" />Disponible</span>
                            <span className="na-leg-item"><span className="na-leg-square na-leg-sel" />Seleccionada</span>
                            <span className="na-leg-item"><span className="na-leg-square na-leg-ocu" />Ocupada</span>
                            <span className="na-leg-item"><span className="na-leg-square na-leg-no" />No disponible</span>
                          </div>
                          <div className="na-estaciones-filter">
                            <label>
                              <input
                                type="checkbox"
                                checked={mostrarSoloDisponibles}
                                onChange={(e) => setMostrarSoloDisponibles(e.target.checked)}
                              />
                              Mostrar solo disponibles
                            </label>
                          </div>
                        </>
                      )}
                      <div className="na-estaciones-container">
                        <div className="na-estaciones-grid">
                          {estacionesDesdeBD.filter(est => {
                            const estaOcupada = estacionesOcupadas.includes(est.id) || bloqueoTotal;
                            const noDisponible = est.estado === "no_disponible" || estaOcupada;
                            if (mostrarSoloDisponibles && noDisponible) return false;
                            return true;
                          }).sort((a, b) => {
                            const nombreA = a.nombre || a.numero || `Estación ${a.id}`;
                            const nombreB = b.nombre || b.numero || `Estación ${b.id}`;

                            return nombreA.localeCompare(nombreB, undefined, { numeric: true, sensitivity: 'base' });
                          }).map((est) => {
                            const seleccionada = estacionesSeleccionadas.includes(est.id);
                            const estaOcupada = estacionesOcupadas.includes(est.id) || bloqueoTotal;
                            const noDisponible = est.estado === "no_disponible";
                            const nombre = est.nombre || est.numero || `Estación ${est.id}`;
                            const isMesa = nombre.toLowerCase().includes('mesa');

                            let clase = "na-estacion-btn";
                            if (seleccionada) clase += " na-estacion-sel";
                            else if (estaOcupada) clase += " na-estacion-ocu";
                            else if (noDisponible) clase += " na-estacion-no";

                            return (
                              <button
                                key={est.id}
                                type="button"
                                className={clase}
                                disabled={estaOcupada || noDisponible}
                                onClick={() => toggleEstacion(est.id)}
                              >
                                {isMesa ? <Grid size={18} /> : <Monitor size={18} />}
                                <span className="na-est-name">{nombre}</span>
                                {estaOcupada && <span className="na-est-sub">Ocupada</span>}
                                {noDisponible && !estaOcupada && <span className="na-est-sub">No disp.</span>}
                              </button>
                            );
                          })}
                        </div>
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
            </div>
          )}

          {isLastStep && tipo && (
            <div className="na-resumen-card" style={{ marginTop: '20px' }}>
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
                  disabled={!canSave}
                >
                  {isLastStep ? (actividadExistente ? "Actualizar actividad" : "Guardar actividad") : "Siguiente"}
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