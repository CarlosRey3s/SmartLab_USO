import { useState ,  useEffect} from 'react';
import { Search, Plus, X } from 'lucide-react';
import '../../css/ModalNuevaActividad.css';

type TipoActividad = "clase" | "mantenimiento" | "reserva" | null;

interface LaboratorioDB{
  id: number;
  nombre: string;
}

interface NuevaActividadProps {
  onClose: () => void;
  onGuardar: (data: any) => void; // Reemplazar 'any' con el tipo correcto de datos que se espera guardar
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
  estacion?: string;
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
interface EquipoSeleccionado {
  id: string;
  nombre: string;
  disponibles: number;
  cantidad?: number;
}

// Datos de ejemplo — reemplazar con llamada a API filtrada por lab + horario
const EQUIPO_DISPONIBLE: EquipoSeleccionado[] = [
  { id: "e1", nombre: "Osciloscopio digital",  disponibles: 4 },
  { id: "e2", nombre: "Multímetro digital",     disponibles: 8 },
  { id: "e3", nombre: "Fuente de poder",        disponibles: 1 },
  { id: "e4", nombre: "Generador de señales",   disponibles: 3 },
  { id: "e5", nombre: "Kit Arduino Uno",        disponibles: 12 },
  { id: "e6", nombre: "Raspberry Pi 4",         disponibles: 5 },
];

function badgeClass(disponibles: number) {
  if (disponibles === 0) return "inv-badge-no";
  if (disponibles <= 2)  return "inv-badge-lim";
  return "inv-badge-ok";
}

function badgeLabel(disponibles: number) {
  if (disponibles === 0) return "No disponible";
  if (disponibles <= 2)  return `Stock bajo (${disponibles})`;
  return `Disponible (${disponibles})`;
}
// ────────────────────────────────────────────────────────

const LABS = [
  { value: "1", label: "Lab 1 · Física" },
  { value: "2", label: "Lab 2 · Electrónica" },
  { value: "3", label: "Lab 3 · Sistemas" },
];

const ESTACIONES: Record<string, string[]> = {
  "1": ["Estación A1 · Cap. 4", "Estación A2 · Cap. 3", "Estación B1 · Cap. 4", "Estación B2 · Cap. 3"],
  "2": ["Estación A1 · Cap. 4", "Estación A2 · Cap. 4", "Estación B1 · Cap. 3", "Estación B2 · Cap. 3", "Estación C1 · Cap. 4"],
  "3": ["Estación A1 · Cap. 5", "Estación A2 · Cap. 5", "Estación B1 · Cap. 4"],
};

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
  mantenimiento:  "El laboratorio quedará bloqueado en ese horario para todos los estudiantes",
  reserva:   "La reserva directa no requiere aprobación y se confirma inmediatamente",
};

const HEADER_SUBS: Record<string, string> = {
  clase: "Clase regular con docente y horario asignado",
  mantenimiento:  "Cierre técnico del laboratorio",
  reserva:   "Reserva directa sin pasar por solicitud",
};

export function ModalNuevaActividad({ onClose, onGuardar }: NuevaActividadProps) {
 // 1 Estado para guardar los laboratorios de la BD

  const [labsDesdeBD,setLabsDesdeBD] = useState<LaboratorioDB[]>([]);
  const [cargandoLabs, setCarganndoLabs] = useState(true);

  // 2 useeffect para traer los datos al abrir el modal
  useEffect(() => {
    const fetchlaboratorios = async () => {
      try{
        const response = await fetch('http://localhost:4000/api/laboratorios');
        const result = await response.json();

        if(result.success){
          setLabsDesdeBD(result.data);
        }
      }catch(error){
        console.error('Error al cargar laboratorios:', error);
      }finally{
        setCarganndoLabs(false);
      }
    }
    fetchlaboratorios();
  }, []); // el array vacio siginifica que se ejecuta solo una vez al montar el componente

  const [tipo, setTipo]   = useState<TipoActividad>(null);
  const [form, setForm]   = useState<FormData>({ tipo: null, numPersonas: 20, recurrencia: "No se repite", equipos: [] });

  // ── Inventario state ──
  const [query, setQuery]           = useState("");
  const [showResults, setShowResults] = useState(false);

  const equiposSeleccionados: EquipoSeleccionado[] = form.equipos || [];

  const resultados = EQUIPO_DISPONIBLE.filter(
    (e) =>
      e.nombre.toLowerCase().includes(query.toLowerCase()) &&
      !equiposSeleccionados.find((s) => s.id === e.id)
  );

 const agregarEquipo = (equipo: EquipoSeleccionado) => {
  setForm((prev) => ({
    ...prev,
    equipos: [
      ...(prev.equipos || []),
      { ...equipo, cantidad: 1 } //  aquí nace la cantidad
    ]
  }));

  setQuery("");
  setShowResults(false);
};
  const quitarEquipo = (id: string) => {
  setForm((prev) => ({
    ...prev,
    equipos: (prev.equipos || []).filter((e) => e.id !== id)
  }));
};

const aumentarCantidad = (id: string) => {
  setForm((prev) => ({
    ...prev,
    equipos: (prev.equipos || []).map((equipo) => {
      if (equipo.id !== id) return equipo;

      const cantidadActual = equipo.cantidad ?? 1;

      return {
        ...equipo,
        cantidad:
          cantidadActual < equipo.disponibles
            ? cantidadActual + 1
            : cantidadActual,
      };
    }),
  }));
};

const disminuirCantidad = (id: string) => {
  setForm((prev) => ({
    ...prev,
    equipos: (prev.equipos || []).map((equipo) => {
      if (equipo.id !== id) return equipo;

      const cantidadActual = equipo.cantidad ?? 1;

      return {
        ...equipo,
        cantidad:
          cantidadActual > 1
            ? cantidadActual - 1
            : 1,
      };
    }),
  }));
};

// ─────────────────────

const set = (field: keyof FormData, value: string | number) =>
  setForm((prev) => ({ ...prev, [field]: value }));

const handleLabChange = (val: string) => {
  set("laboratorio", val);
  set("estacion", "");
};
  const handleTipo = (t: TipoActividad) => {
    setTipo(t);
    setForm({ tipo: t, numPersonas: t === "clase" ? 20 : 3, recurrencia: "No se repite", equipos: [],
      desde: t === "clase" ? "08:00" : t === "mantenimiento" ? "14:00" : "09:00",
      hasta: t === "clase" ? "10:00" : t === "mantenimiento" ? "17:00" : "11:00",
     });
    setQuery("");
  };

  const handleGuardar = () => {
    onGuardar({ ...form, tipo });
    onClose();
  };

  const canSave = tipo !== null;

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

        <div className="na-body">

          {/* Selector de tipo */}
          <div className="na-field-label">TIPO DE ACTIVIDAD</div>
          <div className="na-tipo-selector">
            <button
              className={`na-tipo-btn na-tipo-clase ${tipo === "clase" ? "na-tipo-on" : ""}`}
              onClick={() => handleTipo("clase")}
            >
              <div className="na-tipo-ico na-ico-clase"><CalendarIcon color="#0F6E56" /></div>
              <div className="na-tipo-name">Clase regular</div>
              <div className="na-tipo-desc">Clase con docente asignado</div>
            </button>

            <button
              className={`na-tipo-btn na-tipo-mant ${tipo === "mantenimiento" ? "na-tipo-on na-tipo-mant-on" : ""}`}
              onClick={() => handleTipo("mantenimiento")}
            >
              <div className="na-tipo-ico na-ico-mant"><WrenchIcon color="#A32D2D" /></div>
              <div className="na-tipo-name">Mantenimiento</div>
              <div className="na-tipo-desc">Cierre técnico del laboratorio</div>
            </button>

            <button
              className={`na-tipo-btn na-tipo-res ${tipo === "reserva" ? "na-tipo-on na-tipo-res-on" : ""}`}
              onClick={() => handleTipo("reserva")}
            >
              <div className="na-tipo-ico na-ico-res"><UserIcon color="#854F0B" /></div>
              <div className="na-tipo-name">Reserva directa</div>
              <div className="na-tipo-desc">Reserva manual del admin</div>
            </button>
          </div>

          {/* ── CLASE ── */}
          {tipo === "clase" && (
            <div className="na-fields">
              <div className="na-sep" />
              <div className="na-section-lbl">INFORMACIÓN DE LA CLASE</div>
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
              <div className="na-row2">
                <div className="na-field-group">
                  <label className="na-field-label">LABORATORIO</label>


                  <select className="na-select" value={form.laboratorio || ""} onChange={(e) => set("laboratorio", e.target.value)} disabled={cargandoLabs}>
                    <option value="">{cargandoLabs? "Cargando laboratorios..." : "Selecciona un laboratorio"}</option>
                    {/**Mapeamos los laboratorios que vinieron de la BD */}
                    {labsDesdeBD.map((lab) => (
                        <option key={lab.id} value={lab.id}>{lab.nombre}</option>
                      ))}
                  </select>


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
              <div className="na-sep" />
              <div className="na-section-lbl">FECHA Y HORA</div>
              <div className="na-row3">
                <div className="na-field-group">
                  <label className="na-field-label">FECHA</label>
                  <input className="na-input" type="date" value={form.fecha || ""} onChange={(e) => set("fecha", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">DESDE</label>
                  <input className="na-input" type="time" value={form.desde || "08:00"} onChange={(e) => set("desde", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">HASTA</label>
                  <input className="na-input" type="time" value={form.hasta || "10:00"} onChange={(e) => set("hasta", e.target.value)} />
                </div>
              </div>
              <div className="na-field-group">
                <label className="na-field-label">RECURRENCIA</label>
                <div className="na-recur-row">
                  <RecurIcon />
                  <select className="na-select na-recur-select" value={form.recurrencia || ""} onChange={(e) => set("recurrencia", e.target.value)}>
                    {RECURRENCIA_CLASE.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── MANTENIMIENTO ── */}
          {tipo === "mantenimiento" && (
            <div className="na-fields">
              <div className="na-sep" />
              <div className="na-section-lbl">INFORMACIÓN DEL MANTENIMIENTO</div>
              <div className="na-row2">
                <div className="na-field-group">
                  <label className="na-field-label">LABORATORIO</label>

                  <select className="na-select" value={form.laboratorio || ""} onChange={(e) => set("laboratorio", e.target.value)} disabled={cargandoLabs}>
                    <option value="">{cargandoLabs? "Cargando laboratorios..." : "Selecciona un laboratorio"}</option>
                    {/**Mapeamos los laboratorios que vinieron de la BD */}
                    {labsDesdeBD.map((lab) => (
                        <option key={lab.id} value={lab.id}>{lab.nombre}</option>
                      ))}
                  </select>

                </div>
                <div className="na-field-group">
                  <label className="na-field-label">RESPONSABLE TÉCNICO</label>
                  <input className="na-input" placeholder="Nombre del técnico" value={form.responsable || ""} onChange={(e) => set("responsable", e.target.value)} />
                </div>
              </div>
              <div className="na-field-group">
                <label className="na-field-label">DESCRIPCIÓN DEL TRABAJO</label>
                <textarea className="na-textarea" placeholder="Ej: Revisión general de equipos, cambio de fuente de poder #3..." value={form.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} />
              </div>
              <div className="na-sep" />
              <div className="na-section-lbl">FECHA Y HORA</div>
              <div className="na-row3">
                <div className="na-field-group">
                  <label className="na-field-label">FECHA</label>
                  <input className="na-input" type="date" value={form.fecha || ""} onChange={(e) => set("fecha", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">DESDE</label>
                  <input className="na-input" type="time" value={form.desde || "14:00"} onChange={(e) => set("desde", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">HASTA</label>
                  <input className="na-input" type="time" value={form.hasta || "17:00"} onChange={(e) => set("hasta", e.target.value)} />
                </div>
              </div>
              <div className="na-field-group">
                <label className="na-field-label">RECURRENCIA</label>
                <div className="na-recur-row">
                  <RecurIcon />
                  <select className="na-select na-recur-select" value={form.recurrencia || ""} onChange={(e) => set("recurrencia", e.target.value)}>
                    {RECURRENCIA_SIMPLE.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── RESERVA DIRECTA ── */}
          {tipo === "reserva" && (
            <div className="na-fields">
              <div className="na-sep" />
              <div className="na-section-lbl">INFORMACIÓN DE LA RESERVA</div>
              <div className="na-field-group">
                <label className="na-field-label">TÍTULO / MOTIVO</label>
                <input className="na-input" placeholder="Ej: Demostración para visita académica, Práctica docente..." value={form.titulo || ""} onChange={(e) => set("titulo", e.target.value)} />
              </div>
              <div className="na-row2">
                <div className="na-field-group">
                  <label className="na-field-label">LABORATORIO</label>
                   <select className="na-select" value={form.laboratorio || ""} onChange={(e) => set("laboratorio", e.target.value)} disabled={cargandoLabs}>
                    <option value="">{cargandoLabs? "Cargando laboratorios..." : "Selecciona un laboratorio"}</option>
                    {/**Mapeamos los laboratorios que vinieron de la BD */}
                    {labsDesdeBD.map((lab) => (
                        <option key={lab.id} value={lab.id}>{lab.nombre}</option>
                      ))}
                  </select>

                </div>
                <div className="na-field-group">
                  <label className="na-field-label">ESTACIÓN DE TRABAJO</label>
                  <select className="na-select" value={form.estacion || ""} onChange={(e) => set("estacion", e.target.value)} disabled={!form.laboratorio}>
                    <option value="">{form.laboratorio ? "Selecciona estación..." : "Elige el lab primero..."}</option>
                    {(ESTACIONES[form.laboratorio || ""] || []).map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="na-field-group">
                <label className="na-field-label">N° DE PERSONAS</label>
                <div className="na-num-row">
                  <button className="na-num-btn" onClick={() => set("numPersonas", Math.max(1, (form.numPersonas || 1) - 1))}>−</button>
                  <span className="na-num-val">{form.numPersonas}</span>
                  <button className="na-num-btn" onClick={() => set("numPersonas", (form.numPersonas || 0) + 1)}>+</button>
                </div>
              </div>

              {/* ── CAMPO DE INVENTARIO ── */}
<div className="na-sep" />
<div className="na-section-lbl">SOLICITAR INSTRUMENTO (OPCIONAL)</div>

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
            <span className="inv-result-nombre">
              {equipo.nombre}
            </span>

            <span className={`inv-result-badge ${badgeClass(equipo.disponibles)}`}>
              {badgeLabel(equipo.disponibles)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>

{/* ITEMS SELECCIONADOS */}
{equiposSeleccionados.length > 0 && (
  <ul className="inv-selected-list">
    {equiposSeleccionados.map((equipo) => (
      <li key={equipo.id} className="inv-selected-item">

        <div className="inv-selected-info">
          <span className="inv-selected-nombre">
            {equipo.nombre}
          </span>

          <span className={`inv-result-badge ${badgeClass(equipo.disponibles)}`}>
            {badgeLabel(equipo.disponibles)}
          </span>
        </div>

        <div className="inv-selected-actions">

          <div className="inv-cantidad-wrapper">
            <span className="inv-cantidad-label">
              Cantidad
            </span>

            <div className="inv-cantidad">

              <button
                type="button"
                onClick={() => disminuirCantidad(equipo.id)}
                disabled={(equipo.cantidad || 1) <= 1}
              >
                −
              </button>

              <span>
                {equipo.cantidad || 1}
              </span>

              <button
                type="button"
                onClick={() => aumentarCantidad(equipo.id)}
                disabled={(equipo.cantidad || 1) >= equipo.disponibles}
              >
                +
              </button>

            </div>
          </div>

          <button
            type="button"
            className="inv-quitar-btn"
            onClick={() => quitarEquipo(equipo.id)}
          >
            <X size={14} />
          </button>

        </div>

      </li>
    ))}
  </ul>
)}

<button
  type="button"
  className="inv-add-btn"
  onClick={() => setShowResults(true)}
>
  <Plus size={13} />
  Añadir ítem
</button>
</div>

{/* ── FIN CAMPO DE INVENTARIO ── */}

              <div className="na-sep" />
              <div className="na-section-lbl">FECHA Y HORA</div>
              <div className="na-row3">
                <div className="na-field-group">
                  <label className="na-field-label">FECHA</label>
                  <input className="na-input" type="date" value={form.fecha || ""} onChange={(e) => set("fecha", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">DESDE</label>
                  <input className="na-input" type="time" value={form.desde || "09:00"} onChange={(e) => set("desde", e.target.value)} />
                </div>
                <div className="na-field-group">
                  <label className="na-field-label">HASTA</label>
                  <input className="na-input" type="time" value={form.hasta || "11:00"} onChange={(e) => set("hasta", e.target.value)} />
                </div>
              </div>
              <div className="na-field-group">
                <label className="na-field-label">RECURRENCIA</label>
                <div className="na-recur-row">
                  <RecurIcon />
                  <select className="na-select na-recur-select" value={form.recurrencia || ""} onChange={(e) => set("recurrencia", e.target.value)}>
                    {RECURRENCIA_SIMPLE.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
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
            <button className="na-btn-cancel" onClick={onClose}>Cancelar</button>
            <button
              className={`na-btn-save ${tipo === "mantenimiento" ? "na-btn-save-mant" : ""}`}
              onClick={handleGuardar}
              disabled={!canSave}
            >
              Guardar actividad
            </button>
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