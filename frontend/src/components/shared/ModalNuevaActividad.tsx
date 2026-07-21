import { Search, Plus, X, Monitor, Building2, Grid } from 'lucide-react';
import Select from 'react-select';
import { usuariosService } from '../../services/usuarios.service';
import { chequearDisponibilidad, obtenerInventarioDisponible } from '../../services/actividades.service';
import { laboratoriosService } from '../../services/laboratorios.service';
import { useAuth } from '../../context/AuthContext';
import '../../css/ModalNuevaActividad.css';
import { FormularioMantenimiento } from './ModalActividades/FormularioMantenimiento';
import { FormularioClase } from './ModalActividades/FormularioClase';
import { FormularioReserva } from './ModalActividades/FormularioReserva';
import { SelectorInventario } from './ModalActividades/SelectorInventario';

import { useActividadForm, type FormData } from '../../hooks/useActividadForm';


import { type TipoActividad, type ModoReserva, type LaboratorioDB, type EstacionDB, type EquipoSeleccionado, type ItemInventarioDB } from '../../hooks/useActividadForm';

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

const STEP_SHORT_LABELS: Record<string, string> = {
  datos: "General",
  laboratorio: "Espacio",
  instrumentos: "Equipos",
  horario: "Fecha y hora",
};

interface NuevaActividadProps {
  onClose: () => void;
  onGuardar: (data: any) => void;
  actividadExistente?: any;
}

export function ModalNuevaActividad({ onClose, onGuardar, actividadExistente }: NuevaActividadProps) {
  const { user } = useAuth();
  
  const handleGuardarWrapper = (data: any) => {
    onGuardar({ ...data, usuario_id: user?.id });
  };

  const {
    form, set, tipo, stepIndex,
    labsDesdeBD, cargandoLabs,
    estacionesDesdeBD, cargandoEstaciones,
    inventarioDesdeBD, cargandoInventario,
    tecnicosOptions, docentesOptions,
    estacionesOcupadas, bloqueoTotal, verificando, mostrarSoloDisponibles, setMostrarSoloDisponibles,
    equiposSeleccionados, estacionesSeleccionadas,
    agregarEquipo, quitarEquipo, aumentarCantidad, disminuirCantidad, toggleEstacion,
    handleTipo, handleAtras, handleSiguiente, canSave,
    steps, currentStepKey, isLastStep, laboratorioSeleccionado, modoReserva
  } = useActividadForm({ actividadExistente, onGuardar: handleGuardarWrapper, onClose });

  // Filtrar laboratorios a mostrar según el rol y el tipo
  const laboratoriosAMostrar = labsDesdeBD.filter(lab => {
    // Si el usuario es coordinador y NO está haciendo una reserva, solo ve sus laboratorios
    if (user && user.rol === 'coordinador' && tipo !== 'reserva') {
      return String(lab.coordinador_id) === String(user.id);
    }
    // Si es una reserva directa (tipo === 'reserva') o tiene otro rol (admin), ve todos
    return true;
  });

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
                {user?.rol !== 'docente' && (
                  <>
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
                  </>
                )}

                <button className="na-tipo-btn na-tipo-res" onClick={() => handleTipo("reserva")}>
                  <div className="na-tipo-ico na-ico-res"><UserIcon color="#854F0B" /></div>
                  <div className="na-tipo-name">Reserva directa</div>
                  <div className="na-tipo-desc">Reserva manual del admin</div>
                </button>
              </div>
            </>
          )}

          {/* ── CONEXION CON FORMULARIO CLASE ── */}
          {tipo === "clase" && currentStepKey === "datos" && (
            <FormularioClase
              materia={form.materia}
              docente={form.docente}
              numPersonas={form.numPersonas}
              docentesOptions={docentesOptions}
              onChange={(field, value) => set(field as keyof FormData, value)}
            />
          )}
          {/* ── CONEXIÓN CON FORMULARIO MANTENIMIENTO ── */}
          {tipo === "mantenimiento" && currentStepKey === "datos" && (
            <FormularioMantenimiento
              responsable={form.responsable}
              descripcion={form.descripcion}
              tecnicosOptions={tecnicosOptions}
              onChange={(field, value) => set(field as keyof FormData, value)}
            />
          )}
          {/* ── CONEXIÓN CON FORMULARIO RESERVA ── */}
          {tipo === "reserva" && currentStepKey === "datos" && (
            <FormularioReserva
              titulo={form.titulo}
              onChange={(field, value) => set(field as keyof FormData, value)}
            />
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
                  {laboratoriosAMostrar.map((lab) => (
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

          {/* ── PASO: INSTRUMENTOS (clase y reserva) ──  CONEXION FORMULARIO*/}
          {currentStepKey === "instrumentos" && (tipo === "clase" || tipo === "reserva") && (
            <SelectorInventario
              inventario={inventarioDesdeBD}
              equiposSeleccionados={equiposSeleccionados}
              tieneLaboratorio={!!form.laboratorio}
              onAgregar={agregarEquipo}
              onQuitar={quitarEquipo}
              onAumentar={aumentarCantidad}
              onDisminuir={disminuirCantidad}
            />
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