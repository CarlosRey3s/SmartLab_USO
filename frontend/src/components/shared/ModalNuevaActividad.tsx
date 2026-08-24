import { Monitor, Building2, Grid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import '../../css/ModalNuevaActividad.css';
import { FormularioMantenimiento } from './ModalActividades/FormularioMantenimiento';
import { FormularioClase } from './ModalActividades/FormularioClase';
import { FormularioReserva } from './ModalActividades/FormularioReserva'; // Force TS reload
import { SelectorInventario } from './ModalActividades/SelectorInventario';
import { useActividadForm, type FormData, getDiaSemana } from '../../hooks/useActividadForm';
import { canCreateClassesOrMaintenance, isLimitedToOwnLaboratories } from '../../utils/roleGuard';
import { customToast } from '../custom-toast/CustomToast';

const getRecurrenciaClase = (diaNombre: string) => [
  "No se repite",
  "Todos los días",
  `Cada semana, el ${diaNombre}`,
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
  const [tempTipo, setTempTipo] = useState<string | null>(null);

  //TRADUCTOR DE RECURRENCIA (dE TEXTO UI  a ojeto Estructurado)
  const mapearRecurrenciaAObjeto = (textoRecurrencia: string) => {
    if (!textoRecurrencia || textoRecurrencia === "No se repite") return null;

    switch (textoRecurrencia) {
      case "Todos los días": // Coincidencia exacta con el array
        return { frequency: "DAILY", interval: 1 };

      case "Todos los días hábiles (lunes a viernes)": // Coincidencia exacta con el array
        return { frequency: "WEEKLY", byDay: ["MO", "TU", "WE", "TH", "FR"] };

      case "Todos los meses": {
        const diaDelMes = form.fecha ? new Date(form.fecha + "T12:00:00").getDate() : undefined;
        return { frequency: "MONTHLY", interval: 1, ...(diaDelMes ? { byMonthDay: diaDelMes } : {}) };
      }

      case "Personalizado...": {
        if (!form.customFrequency) return null;
        const resultado: Record<string, any> = { frequency: form.customFrequency, interval: form.customInterval || 1 };
        if (form.customFrequency === 'WEEKLY' && form.customByDay && form.customByDay.length > 0) {
          resultado.byDay = form.customByDay;
        }
        if (form.customEndType === 'count' && form.customCount) {
          resultado.count = form.customCount;
        } else if (form.customEndType === 'until' && form.customUntil) {
          resultado.until = form.customUntil;
        }
        return resultado;
      }

      default:
        // "Cada semana, el {día}" — detecta el día dinámicamente de form.fecha
        if (textoRecurrencia.startsWith("Cada semana, el ")) {
          const dia = getDiaSemana(form.fecha || "");
          return { frequency: "WEEKLY", byDay: [dia.code] };
        }
        // "Cada semana" — recurrencia semanal simple (reservas/mantenimiento)
        if (textoRecurrencia === "Cada semana") {
          return { frequency: "WEEKLY", interval: 1 };
        }
        return null;
    }
  };

  const handleGuardarWrapper = (data: any) => {
    // 1. Un pequeño mapa para traducir el número del día de JavaScript a las letras de RRule
    const mapaDiasRRule = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    if (form.fecha && form.recurrencia === 'Personalizado...' && form.customFrequency === 'WEEKLY') {
      // 2. Extraemos qué día de la semana es la fecha que eligió el usuario en el input de inicio
      const fechaInicioJS = new Date(form.fecha + "T12:00:00");
      const diaInicioLetras = mapaDiasRRule[fechaInicioJS.getDay()]; // Ej: Si es Jueves, devuelve 'TH'
      
      // 3. LA VALIDACIÓN ESTRELLA
      if (form.customByDay && !form.customByDay.includes(diaInicioLetras)) {
        // Lanzamos la alerta y detenemos el guardado
        customToast.error("Error: El día de la Fecha de Inicio no coincide con los días de repetición elegidos. Por favor, inclúyelo o cambia la fecha de inicio.");
        return; // Detenemos la ejecución (no hace el POST al backend)
      }
    }

    //transformamos el texto plano del select de recurrencia en el objeto estruturado seguro
    const recurrenciaEstructurada = mapearRecurrenciaAObjeto(data.recurrencia || form.recurrencia);
    onGuardar({
      ...data,
      recurrencia: recurrenciaEstructurada, // remplazamos la frase en español por el objeto limpio
      usuario_id: user?.id
    });
  };

  const {
    form, set, tipo, stepIndex,
    labsDesdeBD, cargandoLabs,
    estacionesDesdeBD, cargandoEstaciones,
    inventarioDesdeBD,
    docentesOptions,
    estacionesOcupadas, bloqueoTotal, mostrarSoloDisponibles, setMostrarSoloDisponibles,
    equiposSeleccionados, estacionesSeleccionadas, estadoLaboratorios,
    agregarEquipo, quitarEquipo, aumentarCantidad, disminuirCantidad, toggleEstacion,
    handleTipo, handleAtras, handleSiguiente, canSave,
    steps, currentStepKey, isLastStep, laboratorioSeleccionado, modoReserva
  } = useActividadForm({ actividadExistente, onGuardar: handleGuardarWrapper, onClose });

  // Día de la semana dinámico para la opción de recurrencia semanal
  const diaFecha = getDiaSemana(form.fecha || "");

  // Filtrar laboratorios a mostrar según el rol y el tipo
  const laboratoriosAMostrar = labsDesdeBD.filter(lab => {
    // Si el usuario es coordinador y NO está haciendo una reserva, solo ve sus laboratorios
    if (user && isLimitedToOwnLaboratories(user.rol as any) && tipo !== 'reserva') {
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
              {tipo ? HEADER_SUBS[tipo] : "¿Qué tipo de actividad deseas crear?"}
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
            <div className="na-tipo-vertical-list">
              {user && canCreateClassesOrMaintenance(user.rol as any) && (
                <>
                  <button 
                    className={`na-tipo-card ${tempTipo === 'clase' ? 'na-tipo-card-active tipo-clase' : ''}`} 
                    onClick={() => setTempTipo("clase")}
                  >
                    <div className="na-tipo-ico-wrap">
                      <CalendarIcon color={tempTipo === 'clase' ? "#0F6E56" : "#666666"} />
                    </div>
                    <div className="na-tipo-text">
                      <div className="na-tipo-title">Clase regular</div>
                      <div className="na-tipo-desc">Clase con docente asignado</div>
                    </div>
                  </button>

                  <button 
                    className={`na-tipo-card ${tempTipo === 'mantenimiento' ? 'na-tipo-card-active tipo-mantenimiento' : ''}`} 
                    onClick={() => setTempTipo("mantenimiento")}
                  >
                    <div className="na-tipo-ico-wrap">
                      <WrenchIcon color={tempTipo === 'mantenimiento' ? "#A32D2D" : "#666666"} />
                    </div>
                    <div className="na-tipo-text">
                      <div className="na-tipo-title">Cierre técnico</div>
                      <div className="na-tipo-desc">Bloquea el laboratorio por mantenimiento</div>
                    </div>
                  </button>
                </>
              )}

              <button 
                className={`na-tipo-card ${tempTipo === 'reserva' ? 'na-tipo-card-active tipo-reserva' : ''}`} 
                onClick={() => setTempTipo("reserva")}
              >
                <div className="na-tipo-ico-wrap">
                  <UserIcon color={tempTipo === 'reserva' ? "#854F0B" : "#666666"} />
                </div>
                <div className="na-tipo-text">
                  <div className="na-tipo-title">Reserva directa</div>
                  <div className="na-tipo-desc">Reserva un espacio de forma manual</div>
                </div>
              </button>
            </div>
          )}

          {/* ── CONEXION CON FORMULARIO CLASE ── */}
          {tipo === "clase" && currentStepKey === "datos" && (
            <FormularioClase
              materia={form.materia}
              docente={form.docente}
              numPersonas={form.numPersonas}
              docentesOptions={docentesOptions}
              onChange={(field: string, value: any) => set(field as keyof FormData, value)}
            />
          )}
          {/* ── CONEXIÓN CON FORMULARIO MANTENIMIENTO ── */}
          {tipo === "mantenimiento" && currentStepKey === "datos" && (
            <FormularioMantenimiento
              descripcion={form.descripcion}
              onChange={(field: string, value: any) => set(field as keyof FormData, value)}
            />
          )}
          {/* ── CONEXIÓN CON FORMULARIO RESERVA ── */}
          {tipo === "reserva" && currentStepKey === "datos" && (
            <FormularioReserva
              titulo={form.titulo}
              onChange={(field: string, value: any) => set(field as keyof FormData, value)}
            />
          )}

          {/* ── PASO: LABORATORIO (y estación, solo para reserva) ── */}
          {currentStepKey === "laboratorio" && tipo && (
            <div className="na-fields">
              <div className="na-field-group">
                <label className="na-field-label">ESPACIO</label>
                <select
                  className="na-select"
                  value={form.laboratorio || ""}
                  onChange={(e) => { set("laboratorio", e.target.value); set("estaciones" as keyof FormData, [] as any); }}
                  disabled={cargandoLabs}
                >
                  <option value="">{cargandoLabs ? "Cargando espacios..." : "Selecciona un espacio"}</option>
                  {laboratoriosAMostrar.map((lab) => {
                    const isOcupado = estadoLaboratorios[lab.id]?.ocupado;
                    return (
                      <option key={lab.id} value={lab.id} disabled={isOcupado}>
                        {lab.nombre}{isOcupado ? " (Ocupado a esta hora)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {tipo === "reserva" && form.laboratorio && (
                <>
                  <div className="na-field-group">
                    <label className="na-field-label">N° DE PERSONAS</label>
                    <input
                      className="na-input"
                      type="number"
                      min={1}
                      value={form.numPersonas || ""}
                      onChange={(e) => set("numPersonas", Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Ej: 10"
                      style={{ width: '120px' }}
                    />
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
                        Este Espacio se reserva entero, sin estaciones individuales
                        {laboratorioSeleccionado?.capacidad_maxima ? ` · capacidad ${laboratorioSeleccionado.capacidad_maxima} personas` : ""}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tipo === "mantenimiento" && (
                <div className="na-hint">Este tipo de actividad bloquea el espacio completo, no requiere seleccionar estación.</div>
              )}
            </div>
          )}

          {/* ── PASO: INSTRUMENTOS (clase y reserva) ──  CONEXION FORMULARIO*/}
          {currentStepKey === "instrumentos" && (tipo === "clase" || tipo === "reserva") && (
            <>
              <SelectorInventario
                inventario={inventarioDesdeBD}
                equiposSeleccionados={equiposSeleccionados}
                tieneLaboratorio={!!form.laboratorio}
                onAgregar={agregarEquipo}
                onQuitar={quitarEquipo}
                onAumentar={aumentarCantidad}
                onDisminuir={disminuirCantidad}
              />

              {/* ── NOTA ADICIONAL (solo reservas) ── */}
              {tipo === "reserva" && (
                <div className="na-fields" style={{ marginTop: '18px' }}>
                  <div className="na-field-group">
                    <label className="na-field-label">NOTA ADICIONAL (OPCIONAL)</label>
                    <textarea
                      className="na-input"
                      placeholder="Ej: Necesito proyector, traeremos invitados externos, requiero acceso especial..."
                      value={form.nota_adicional || ""}
                      onChange={(e) => set("nota_adicional" as keyof FormData, e.target.value)}
                      rows={3}
                      style={{ resize: 'vertical', minHeight: '60px' }}
                    />
                  </div>
                </div>
              )}
            </>
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
                  <CalendarIcon color="#4b5563" />
                  <select
                    className="na-select na-recur-select"
                    value={form.recurrencia || "No se repite"} /* <- Ajuste 1: Valor por defecto exacto */
                    onChange={(e) => set("recurrencia", e.target.value)}
                  >
                    {(tipo === "clase" ? getRecurrenciaClase(diaFecha.nombre) : RECURRENCIA_SIMPLE).map((r) => (
                      <option key={r} value={r}> {/* <- Ajuste 2: Se agregó el atributo value={r} */}
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Panel de recurrencia personalizada ── */}
              {form.recurrencia === "Personalizado..." && (
                <div className="na-custom-recur">
                  <div className="na-custom-recur-title">Configuración personalizada</div>

                  {/* Repetir cada N día(s)/semana(s)/mes(es) */}
                  <div className="na-field-group">
                    <label className="na-field-label">REPETIR CADA</label>
                    <div className="na-custom-recur-interval">
                      <input
                        className="na-input na-custom-recur-num"
                        type="number"
                        min={1}
                        max={99}
                        value={form.customInterval || 1}
                        onChange={(e) => set("customInterval" as keyof FormData, Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <select
                        className="na-select"
                        value={form.customFrequency || "WEEKLY"}
                        onChange={(e) => set("customFrequency" as keyof FormData, e.target.value)}
                      >
                        <option value="DAILY">día(s)</option>
                        <option value="WEEKLY">semana(s)</option>
                        <option value="MONTHLY">mes(es)</option>
                      </select>
                    </div>
                  </div>

                  {/* Días de la semana (solo si es WEEKLY) */}
                  {form.customFrequency === "WEEKLY" && (
                    <div className="na-field-group">
                      <label className="na-field-label">SE REPITE EL</label>
                      <div className="na-custom-recur-days">
                        {([["MO", "Lu"], ["TU", "Ma"], ["WE", "Mi"], ["TH", "Ju"], ["FR", "Vi"], ["SA", "Sá"], ["SU", "Do"]] as [string, string][]).map(([code, label]) => {
                          const selected = (form.customByDay || []).includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              className={`na-day-chip${selected ? " na-day-chip--on" : ""}`}
                              onClick={() => {
                                const current = form.customByDay || [];
                                const updated = current.includes(code)
                                  ? current.filter((d: string) => d !== code)
                                  : [...current, code];
                                set("customByDay" as keyof FormData, updated);
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Finalización */}
                  <div className="na-field-group">
                    <label className="na-field-label">FINALIZA</label>
                    <div className="na-custom-recur-end">
                      <label className="na-custom-recur-radio">
                        <input
                          type="radio"
                          name="customEndType"
                          checked={form.customEndType === "never" || !form.customEndType}
                          onChange={() => set("customEndType" as keyof FormData, "never")}
                        />
                        <span>Nunca</span>
                      </label>
                      <label className="na-custom-recur-radio">
                        <input
                          type="radio"
                          name="customEndType"
                          checked={form.customEndType === "count"}
                          onChange={() => set("customEndType" as keyof FormData, "count")}
                        />
                        <span>Después de</span>
                        <input
                          className="na-input na-custom-recur-num"
                          type="number"
                          min={1}
                          max={365}
                          value={form.customCount || 10}
                          disabled={form.customEndType !== "count"}
                          onChange={(e) => set("customCount" as keyof FormData, Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <span>ocurrencias</span>
                      </label>
                      <label className="na-custom-recur-radio">
                        <input
                          type="radio"
                          name="customEndType"
                          checked={form.customEndType === "until"}
                          onChange={() => set("customEndType" as keyof FormData, "until")}
                        />
                        <span>En fecha</span>
                        <input
                          className="na-input na-custom-recur-date"
                          type="date"
                          value={form.customUntil || ""}
                          disabled={form.customEndType !== "until"}
                          onChange={(e) => set("customUntil" as keyof FormData, e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
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
                {actividadExistente && stepIndex === 0 ? (
                  <button className="na-btn-cancel" onClick={onClose}>
                    Cancelar
                  </button>
                ) : (
                  <button className="na-btn-cancel" onClick={handleAtras}>
                    {stepIndex === 0 ? "Cambiar tipo" : "Atrás"}
                  </button>
                )}
                <button
                  className={`na-btn-save ${tipo === "mantenimiento" ? "na-btn-save-mant" : ""}`}
                  onClick={handleSiguiente}
                  disabled={!canSave}
                >
                  {isLastStep ? (actividadExistente ? "Actualizar actividad" : "Guardar actividad") : "Siguiente"}
                </button>
              </>
            ) : (
              <>
                <button className="na-btn-cancel" onClick={onClose}>Cancelar</button>
                <button 
                  className="na-btn-save" 
                  onClick={() => { if (tempTipo) handleTipo(tempTipo as any); }} 
                  disabled={!tempTipo}
                >
                  Continuar
                </button>
              </>
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
