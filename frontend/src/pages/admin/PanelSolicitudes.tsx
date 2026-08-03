import React, { useState, useEffect } from 'react';
import { Check, X, Clock, MapPin, Monitor, Wrench, User, ChevronDown, ChevronUp } from 'lucide-react';
import type { SolicitudPendiente } from '../../types/solicitudes.types';
import { obtenerTodasSolicitudes, resolverSolicitud } from '../../services/solicitudes.services';
import { ConfirmModal } from '../../components/confirm-modal/ConfirmModal';
import { customToast } from '../../components/custom-toast/CustomToast';
// 👇 1. IMPORTA TU CONTEXTO DE AUTENTICACIÓN AQUÍ
import { useAuth } from '../../context/AuthContext';
import '../../css/solicitudes.css';

type TabType = 'pendiente' | 'aprobada' | 'rechazada';

const PanelSolicitudes: React.FC = () => {
  // 👇 2. EXTRAE EL USUARIO LOGUEADO
  const { user } = useAuth();

  // 👇 3. VARIABLE MÁGICA DE CONTROL DE ACCESO (RBAC Frontend)
  const rolUsuario = user?.rol?.toLowerCase() || '';
  const esAutoridad = rolUsuario === 'administrador' || rolUsuario === 'coordinador';

  const [solicitudes, setSolicitudes] = useState<SolicitudPendiente[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [tabActiva, setTabActiva] = useState<TabType>('pendiente');
  const [detalleAbierto, setDetalleAbierto] = useState<number | null>(null);

  // Estados para el ConfirmModal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: number; accion: 'aprobar' | 'rechazar' } | null>(null);

  // Cargar TODAS las solicitudes (pendientes, aprobadas, rechazadas)
  const cargarSolicitudes = async () => {
    try {
      setCargando(true);
      const data = await obtenerTodasSolicitudes();
      setSolicitudes(data);
    } catch (error) {
      console.error('Error al cargar las solicitudes:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  // Motor de decisión: Botones Aprobar y Rechazar
  const solicitarResolucion = (actividadId: number, accion: 'aprobar' | 'rechazar') => {
    setConfirmData({ id: actividadId, accion });
    setIsConfirmOpen(true);
  };

  const procesarResolucion = async () => {
    if (!confirmData) return;
    const { id, accion } = confirmData;

    try {
      await resolverSolicitud(id, accion);
      customToast.success(`Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente.`);
      cargarSolicitudes();
    } catch (error: any) {
      console.error(`Error al ${accion} la solicitud:`, error);
      const mensajeError = error.response?.data?.message || `Ocurrió un error interno al ${accion} la solicitud.`;
      customToast.error(`Error: ${mensajeError}`);
    } finally {
      setIsConfirmOpen(false);
      setConfirmData(null);
    }
  };

  // Formatear fecha corta: "Lun 14 jul"
  const formatearFechaCorta = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  };

  // Formatear solo la hora: "08:00"
  const formatearHora = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Formatear fecha + hora completa para el detalle
  const formatearFechaHoraCompleta = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Badge de rol capitalizado
  const formatearRol = (rol?: string) => {
    if (!rol) return null;
    return rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase();
  };

  // Filtrar por tab activa
  const solicitudesFiltradas = solicitudes.filter(s => s.estado_reserva === tabActiva);
  const contadorPendientes = solicitudes.filter(s => s.estado_reserva === 'pendiente').length;

  // Toggle detalle
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
        {(['pendiente', 'aprobada', 'rechazada'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`ps-tab${tabActiva === tab ? ' ps-tab--activa' : ''}`}
            onClick={() => { setTabActiva(tab); setDetalleAbierto(null); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1) + 's'}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      {cargando ? (
        <div className="estado-mensaje">
          <Clock className="icono-spin" size={18} /> Cargando...
        </div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="estado-mensaje">
          No hay solicitudes {tabActiva === 'pendiente' ? 'pendientes' : tabActiva === 'aprobada' ? 'aprobadas' : 'rechazadas'}.
        </div>
      ) : (
        <div className="lista-solicitudes">
          {solicitudesFiltradas.map((solicitud) => {
            const estaAbierto = detalleAbierto === solicitud.actividad_id;
            const rol = formatearRol(solicitud.solicitante_rol);

            return (
              <div key={solicitud.actividad_id} className="tarjeta-solicitud">

                {/* ── Cabecera compacta ── */}
                <div className="tarjeta-header">
                  <span className="tarjeta-titulo">{solicitud.laboratorio_nombre}</span>
                  {rol && esAutoridad && (
                    <span className={`badge-rol badge-rol--${solicitud.solicitante_rol?.toLowerCase()}`}>
                      {rol}
                    </span>
                  )}
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
                        <strong>Fin:</strong> {formatearHora(solicitud.fecha_hora_fin)}
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
                  </div>
                )}

                {/* 👇 4. Footer Modificado con control de acceso */}
                <div className="tarjeta-footer">
                  {tabActiva === 'pendiente' && (
                    <div className="tarjeta-acciones">
                      {esAutoridad ? (
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
                        <span style={{ fontSize: '0.85rem', color: '#856404', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={14} /> En espera de revisión
                        </span>
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

      {/* ── Modal de Confirmación ── */}
      {esAutoridad && (
        <ConfirmModal
          isOpen={isConfirmOpen}
          title={confirmData?.accion === 'aprobar' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
          message={`¿Estás seguro de que deseas ${confirmData?.accion} esta solicitud?`}
          confirmText={confirmData?.accion === 'aprobar' ? 'Aprobar' : 'Rechazar'}
          cancelText="Cancelar"
          type={confirmData?.accion === 'aprobar' ? 'info' : 'danger'}
          onConfirm={procesarResolucion}
          onCancel={() => {
            setIsConfirmOpen(false);
            setConfirmData(null);
          }}
        />
      )}
    </div>
  );
};

export { PanelSolicitudes };