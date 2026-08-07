import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Clock, MapPin, Monitor, Wrench, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SolicitudPendiente } from '../../types/solicitudes.types';
import { obtenerTodasSolicitudes, resolverSolicitud, cancelarSolicitud } from '../../services/solicitudes.services';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
import { useAuth } from '../../context/AuthContext';
import '../../css/solicitudes.css';

type TabType = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
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
  const [confirmData, setConfirmData] = useState<{ id: number; accion: 'aprobar' | 'rechazar' | 'cancelar' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

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

  // ── Motor de decisión: Aprobar / Rechazar / Cancelar ──
  const solicitarResolucion = (actividadId: number, accion: 'aprobar' | 'rechazar' | 'cancelar') => {
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
        {(['pendiente', 'aprobada', 'rechazada', 'cancelada'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`ps-tab${tabActiva === tab ? ' ps-tab--activa' : ''}`}
            onClick={() => cambiarTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1) + 's'}
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
          No hay solicitudes {tabActiva === 'pendiente' ? 'pendientes' : tabActiva === 'aprobada' ? 'aprobadas' : tabActiva === 'rechazada' ? 'rechazadas' : 'canceladas'}.
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
          'Cancelar Solicitud'
        }
        message={
          isProcessing
            ? 'Procesando...'
            : `¿Estás seguro de que deseas ${confirmData?.accion} esta solicitud?`
        }
        confirmText={
          isProcessing ? 'Procesando...' :
          confirmData?.accion === 'aprobar' ? 'Aprobar' :
          confirmData?.accion === 'rechazar' ? 'Rechazar' :
          'Sí, cancelar'
        }
        cancelText="Volver"
        type={confirmData?.accion === 'aprobar' ? 'info' : 'danger'}
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
    </div>
  );
};

export { PanelSolicitudes };