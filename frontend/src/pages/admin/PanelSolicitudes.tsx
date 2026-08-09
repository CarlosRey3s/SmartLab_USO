import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Clock, MapPin, Monitor, Wrench, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw, UserX, UserCheck } from 'lucide-react';
import type { SolicitudPendiente } from '../../types/solicitudes.types';
import { obtenerTodasSolicitudes, resolverSolicitud, cancelarSolicitud, reprogramarSolicitud, marcarAusente, marcarAsistencia } from '../../services/solicitudes.services';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
import { useAuth } from '../../context/AuthContext';
import '../../css/solicitudes.css';

type TabType = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | 'incompleto' | 'ausente';
const ITEMS_POR_PAGINA = 10;

const PanelSolicitudes: React.FC = () => {
  const { user } = useAuth();

  const rolUsuario = user?.rol?.toLowerCase() || '';
  const esAutoridad = rolUsuario === 'administrador' || rolUsuario === 'coordinador';

  // Estado de datos
  const [solicitudes, setSolicitudes] = useState<SolicitudPendiente[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [tabActiva, setTabActiva] = useState<TabType>('pendiente');
  const [detalleAbierto, setDetalleAbierto] = useState<number | null>(null);

  // Paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [contadores, setContadores] = useState<Record<string, number>>({});

  // ConfirmModal + protección doble clic
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: number; accion: 'aprobar' | 'rechazar' | 'cancelar' | 'ausente' | 'asistencia' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Modal de Reprogramación
  const [isReprogramarOpen, setIsReprogramarOpen] = useState(false);
  const [reprogramarId, setReprogramarId] = useState<number | null>(null);
  const [repFecha, setRepFecha] = useState('');
  const [repHoraInicio, setRepHoraInicio] = useState('');
  const [repHoraFin, setRepHoraFin] = useState('');
  const [isReprogramando, setIsReprogramando] = useState(false);

  // ── Cargar solicitudes paginadas desde el backend ──
  const cargarSolicitudes = useCallback(async (estado?: string, page?: number) => {
    try {
      setCargando(true);
      const tab = estado || tabActiva;
      const pagina = page ?? paginaActual;
      const data = await obtenerTodasSolicitudes(tab, pagina, ITEMS_POR_PAGINA);
      setSolicitudes(data.solicitudes);
      setTotalPaginas(data.totalPages);
      setContadores(data.contadores);
    } catch (error) {
      console.error('Error al cargar las solicitudes:', error);
    } finally {
      setCargando(false);
    }
  }, [tabActiva, paginaActual]);

  useEffect(() => {
    cargarSolicitudes(tabActiva, paginaActual);
  }, [tabActiva, paginaActual]);

  const solicitarResolucion = (actividadId: number, accion: 'aprobar' | 'rechazar' | 'cancelar' | 'ausente' | 'asistencia') => {
    setConfirmData({ id: actividadId, accion });
    setIsConfirmOpen(true);
  };

  const procesarResolucion = async () => {
    if (!confirmData || isProcessing) return;
    setIsProcessing(true);
    const { id, accion } = confirmData;

    try {
      if (accion === 'cancelar') {
        await cancelarSolicitud(id);
        customToast.success('Solicitud cancelada exitosamente.');
      } else if (accion === 'ausente') {
        await marcarAusente(id);
        customToast.success('Estudiante marcado como ausente. Inventario liberado.');
      } else if (accion === 'asistencia') {
        await marcarAsistencia(id);
        customToast.success('Ingreso registrado exitosamente.');
      } else {
        await resolverSolicitud(id, accion, accion === 'rechazar' ? motivoRechazo : undefined);
        customToast.success(`Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente.`);
      }
      cargarSolicitudes(tabActiva, paginaActual);
    } catch (error: any) {
      console.error(`Error al ${accion} la solicitud:`, error);
      const mensajeError = error.response?.data?.message || `Ocurrió un error interno al ${accion} la solicitud.`;
      customToast.error(`Error: ${mensajeError}`);
    } finally {
      setIsConfirmOpen(false);
      setConfirmData(null);
      setMotivoRechazo('');
      setIsProcessing(false);
    }
  };

  // ── Reprogramar ──
  const abrirModalReprogramar = (actividadId: number) => {
    setReprogramarId(actividadId);
    setRepFecha('');
    setRepHoraInicio('');
    setRepHoraFin('');
    setIsReprogramarOpen(true);
  };

  const procesarReprogramacion = async () => {
    if (!reprogramarId || isReprogramando) return;
    if (!repFecha || !repHoraInicio || !repHoraFin) {
      customToast.error('Debes completar la fecha, hora de inicio y hora de fin.');
      return;
    }
    setIsReprogramando(true);
    try {
      await reprogramarSolicitud(reprogramarId, repFecha, repHoraInicio, repHoraFin);
      customToast.success('Solicitud reprogramada exitosamente. Se creó una nueva solicitud pendiente.');
      setIsReprogramarOpen(false);
      setReprogramarId(null);
      cargarSolicitudes(tabActiva, paginaActual);
    } catch (error: any) {
      console.error('Error al reprogramar:', error);
      const msg = error.response?.data?.message || 'Ocurrió un error al reprogramar la solicitud.';
      customToast.error(`Error: ${msg}`);
    } finally {
      setIsReprogramando(false);
    }
  };

  // ── Helpers de formato ──
  const formatearFechaCorta = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  };

  const formatearHora = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatearFechaHoraCompleta = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatearRol = (rol?: string) => {
    if (!rol) return null;
    return rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase();
  };

  // ── Contadores desde el backend ──
  const contadorPendientes = contadores['pendiente'] || 0;

  // ── Navegación de tabs y páginas ──
  const cambiarTab = (tab: TabType) => {
    setTabActiva(tab);
    setPaginaActual(1);
    setDetalleAbierto(null);
  };

  const toggleDetalle = (id: number) => {
    setDetalleAbierto(prev => prev === id ? null : id);
  };

  // ── Obtener fecha mínima (hoy) para el input date ──
  const getFechaMinima = () => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="panel-solicitudes-container">

      {/* ── Encabezado ── */}
      <div className="ps-header">
        <h2 className="ps-titulo">{esAutoridad ? 'Solicitudes Recibidas' : 'Mis Solicitudes'}</h2>
        {contadorPendientes > 0 && (
          <span className="ps-badge-contador">{contadorPendientes} pendientes</span>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="ps-tabs">
        {(['pendiente', 'aprobada', 'rechazada', 'cancelada', 'incompleto', 'ausente'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`ps-tab${tabActiva === tab ? ' ps-tab--activa' : ''}${tab === 'incompleto' ? ' ps-tab--incompleto' : ''}${tab === 'ausente' ? ' ps-tab--ausente' : ''}`}
            onClick={() => cambiarTab(tab)}
          >
            {tab === 'incompleto' ? 'Incompletas' : tab === 'ausente' ? 'Ausentes' : tab.charAt(0).toUpperCase() + tab.slice(1) + 's'}
            {contadores[tab] ? ` (${contadores[tab]})` : ''}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      {cargando ? (
        <div className="estado-mensaje">
          <Clock className="icono-spin" size={18} /> Cargando...
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="estado-mensaje">
          No hay solicitudes {tabActiva === 'pendiente' ? 'pendientes' : tabActiva === 'aprobada' ? 'aprobadas' : tabActiva === 'rechazada' ? 'rechazadas' : tabActiva === 'incompleto' ? 'incompletas' : tabActiva === 'ausente' ? 'ausentes' : 'canceladas'}.
        </div>
      ) : (
        <div className="lista-solicitudes">
          {solicitudes.map((solicitud) => {
            const estaAbierto = detalleAbierto === solicitud.actividad_id;
            const rol = formatearRol(solicitud.solicitante_rol);

            return (
              <div key={solicitud.actividad_id} className="tarjeta-solicitud">

                {/* ── Cabecera compacta ── */}
                <div className="tarjeta-header">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="tarjeta-titulo">
                      {solicitud.titulo || solicitud.laboratorio_nombre}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#6b7280', marginTop: '1px' }}>
                      {solicitud.laboratorio_nombre}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                    {rol && esAutoridad && (
                      <span className={`badge-rol badge-rol--${solicitud.solicitante_rol?.toLowerCase()}`}>
                        {rol}
                      </span>
                    )}
                    {esAutoridad && solicitud.es_propia && (
                      <span className="badge-propia">Tu solicitud</span>
                    )}
                  </div>
                </div>

                {/* ── Info resumida ── */}
                <div className="tarjeta-info-resumida">
                  {esAutoridad && (
                    <span className="tarjeta-solicitante">
                      {solicitud.solicitante_nombre} {solicitud.solicitante_apellido}
                      {' · '}
                    </span>
                  )}
                  <span className="tarjeta-solicitante">
                    {formatearFechaCorta(solicitud.fecha_hora_inicio)}
                  </span>
                  <span className="tarjeta-horario">
                    <Clock size={13} />
                    {formatearHora(solicitud.fecha_hora_inicio)} – {formatearHora(solicitud.fecha_hora_fin)}
                  </span>
                </div>

                {/* ── Detalle expandible ── */}
                {estaAbierto && (
                  <div className="tarjeta-detalle">
                    {esAutoridad && (
                      <>
                        <div className="detalle-fila">
                          <User size={14} />
                          <span>
                            <strong>Correo:</strong> {solicitud.solicitante_correo}
                          </span>
                        </div>
                        {solicitud.solicitante_expediente && (
                          <div className="detalle-fila">
                            <User size={14} />
                            <span>
                              <strong>Expediente:</strong> {solicitud.solicitante_expediente}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="detalle-fila">
                      <Clock size={14} />
                      <span>
                        <strong>Inicio:</strong> {formatearFechaHoraCompleta(solicitud.fecha_hora_inicio)}
                      </span>
                    </div>
                    <div className="detalle-fila">
                      <Clock size={14} />
                      <span>
                        <strong>Fin:</strong> {formatearFechaHoraCompleta(solicitud.fecha_hora_fin)}
                      </span>
                    </div>
                    <div className="detalle-fila">
                      <MapPin size={14} />
                      <span>
                        <strong>Espacio:</strong> {solicitud.laboratorio_nombre} — Aula {solicitud.aula} ({solicitud.edificio})
                      </span>
                    </div>

                    {(solicitud.estaciones.length > 0 || solicitud.inventario.length > 0) && (
                      <div className="detalle-recursos">
                        <strong>Recursos solicitados:</strong>
                        {solicitud.estaciones.length > 0 && (
                          <div className="detalle-fila">
                            <Monitor size={14} />
                            <span>Estaciones: {solicitud.estaciones.map(e => e.nombre).join(', ')}</span>
                          </div>
                        )}
                        {solicitud.inventario.length > 0 && (
                          <div className="detalle-fila">
                            <Wrench size={14} />
                            <span>Inventario: {solicitud.inventario.map(i => `${i.nombre} (x${i.cantidad})`).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {solicitud.nota_adicional && (
                      <div className="detalle-nota">
                        <strong>Nota:</strong> {solicitud.nota_adicional}
                      </div>
                    )}
                    {solicitud.estado_reserva === 'rechazada' && solicitud.motivo_resolucion && (
                      <div className="detalle-nota" style={{ marginTop: '8px', borderLeftColor: '#ef4444' }}>
                        <strong style={{ color: '#ef4444' }}>Motivo de rechazo:</strong> {solicitud.motivo_resolucion}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Footer con control de acceso ── */}
                <div className="tarjeta-footer">
                  {tabActiva === 'pendiente' && (
                    <div className="tarjeta-acciones">
                      {esAutoridad && !solicitud.es_propia ? (
                        <>
                          <button
                            className="btn-aprobar"
                            onClick={() => solicitarResolucion(solicitud.actividad_id, 'aprobar')}
                          >
                            <Check size={15} /> Aprobar
                          </button>
                          <button
                            className="btn-rechazar"
                            onClick={() => solicitarResolucion(solicitud.actividad_id, 'rechazar')}
                          >
                            <X size={15} /> Rechazar
                          </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{ fontSize: '0.85rem', color: '#856404', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={14} /> En espera
                          </span>
                          <button
                            className="btn-cancelar"
                            onClick={() => solicitarResolucion(solicitud.actividad_id, 'cancelar')}
                          >
                            <X size={15} /> Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {tabActiva === 'incompleto' && esAutoridad && (
                    <div className="tarjeta-acciones">
                      <button
                        className="btn-reprogramar"
                        onClick={() => abrirModalReprogramar(solicitud.actividad_id)}
                      >
                        <RefreshCw size={15} /> Reprogramar
                      </button>
                    </div>
                  )}

                  {tabActiva === 'aprobada' && esAutoridad && (
                    <div className="tarjeta-acciones">
                      {(solicitud.estaciones.length === 0 && solicitud.inventario.length === 0) && (
                        <button
                          className="btn-aprobar"
                          onClick={() => solicitarResolucion(solicitud.actividad_id, 'asistencia')}
                        >
                          <UserCheck size={15} /> Registrar Ingreso
                        </button>
                      )}
                      <button
                        className="btn-ausente"
                        onClick={() => solicitarResolucion(solicitud.actividad_id, 'ausente')}
                      >
                        <UserX size={15} /> Marcar Inasistencia
                      </button>
                    </div>
                  )}

                  <button
                    className="btn-ver-detalle"
                    onClick={() => toggleDetalle(solicitud.actividad_id)}
                  >
                    {estaAbierto ? (
                      <><ChevronUp size={14} /> Ocultar detalle</>
                    ) : (
                      <><ChevronDown size={14} /> Ver detalle</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Paginación ── */}
      {!cargando && totalPaginas > 1 && (
        <div className="ps-pagination">
          <button
            disabled={paginaActual <= 1}
            onClick={() => setPaginaActual(prev => prev - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span>{paginaActual} / {totalPaginas}</span>
          <button
            disabled={paginaActual >= totalPaginas}
            onClick={() => setPaginaActual(prev => prev + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Modal de Confirmación ── */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title={
          confirmData?.accion === 'aprobar' ? 'Aprobar Solicitud' :
          confirmData?.accion === 'rechazar' ? 'Rechazar Solicitud' :
          confirmData?.accion === 'ausente' ? 'Marcar Inasistencia' :
          confirmData?.accion === 'asistencia' ? 'Registrar Ingreso' :
          'Cancelar Solicitud'
        }
        message={
          isProcessing
            ? 'Procesando...'
            : confirmData?.accion === 'ausente'
            ? '¿Estás seguro de marcar a este estudiante como ausente? Esto liberará el inventario reservado.'
            : confirmData?.accion === 'asistencia'
            ? '¿Confirmas que el estudiante ya ingresó al espacio asignado?'
            : `¿Estás seguro de que deseas ${confirmData?.accion} esta solicitud?`
        }
        confirmText={
          isProcessing ? 'Procesando...' :
          confirmData?.accion === 'aprobar' ? 'Aprobar' :
          confirmData?.accion === 'rechazar' ? 'Rechazar' :
          confirmData?.accion === 'ausente' ? 'Confirmar Ausencia' :
          confirmData?.accion === 'asistencia' ? 'Confirmar Ingreso' :
          'Sí, cancelar'
        }
        cancelText="Volver"
        type={confirmData?.accion === 'aprobar' ? 'info' : confirmData?.accion === 'asistencia' ? 'info' : 'danger'}
        onConfirm={procesarResolucion}
        onCancel={() => {
          if (!isProcessing) {
            setIsConfirmOpen(false);
            setConfirmData(null);
            setMotivoRechazo('');
          }
        }}
      >
        {confirmData?.accion === 'rechazar' && (
          <div style={{ marginTop: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '8px' }}>
              Motivo del rechazo (opcional)
            </label>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Explica brevemente por qué se rechaza la solicitud..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                resize: 'none',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>
        )}
      </ConfirmModal>

      {/* ── Modal de Reprogramación ── */}
      <ConfirmModal
        isOpen={isReprogramarOpen}
        title="Reprogramar Solicitud"
        message={isReprogramando ? 'Procesando reprogramación...' : 'Selecciona la nueva fecha y horario para esta solicitud.'}
        confirmText={isReprogramando ? 'Procesando...' : 'Reprogramar'}
        cancelText="Cancelar"
        type="info"
        onConfirm={procesarReprogramacion}
        onCancel={() => {
          if (!isReprogramando) {
            setIsReprogramarOpen(false);
            setReprogramarId(null);
          }
        }}
      >
        <div className="reprogramar-form">
          <div className="reprogramar-campo">
            <label>Nueva fecha</label>
            <input
              type="date"
              value={repFecha}
              min={getFechaMinima()}
              onChange={(e) => setRepFecha(e.target.value)}
            />
          </div>
          <div className="reprogramar-horarios">
            <div className="reprogramar-campo">
              <label>Hora inicio</label>
              <input
                type="time"
                value={repHoraInicio}
                onChange={(e) => setRepHoraInicio(e.target.value)}
              />
            </div>
            <div className="reprogramar-campo">
              <label>Hora fin</label>
              <input
                type="time"
                value={repHoraFin}
                onChange={(e) => setRepHoraFin(e.target.value)}
              />
            </div>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
};

export { PanelSolicitudes };