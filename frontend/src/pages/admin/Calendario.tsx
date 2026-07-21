import { useState, useEffect, createContext, useContext } from 'react';
import {
  Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Plus, Printer, X, User, Wrench, FileText, Info,
  Edit2, Trash2, Filter
} from 'lucide-react';
import { Calendar, dateFnsLocalizer, type ToolbarProps, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { PanelSolicitudes } from './PanelSolicitudes.tsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ModalNuevaActividad } from '../../components/shared/ModalNuevaActividad';
import { obtenerActividades, crearActividad, actualizarActividad, eliminarActividad } from '../../services/actividades.service';
import '../../css/calendario.css';
import { customToast } from '../../components/custom-toast/CustomToast.tsx';
import { useAuth } from '../../context/AuthContext';

// ── 1. CONFIGURACIÓN DE FECHAS E IDIOMA ──
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), getDay, locales,
});

const NavegacionContext = createContext({ irAFecha: (fecha: Date) => { } });

// ── 2. INTERFAZ PARA EVENTOS (Consulta SQL) ──
export interface EventoLaboratorio {
  id: number;
  title: string;
  start: Date;
  end: Date;
  tipo: 'clase' | 'mantenimiento' | 'reserva';
  laboratorio_id: number;
  laboratorio_nombre: string; // Cambio: Ahora es obligatorio o string directo
  coordinador_id?: number; // Agregado
  materia?: string;
  docente_id?: number;
  docente_nombre?: string; // ¡Añadir!
  clase_estudiantes?: number;
  tecnico_responsable?: number;
  tecnico_nombre?: string; // ¡Añadir!
  mant_descripcion?: string;
  reserva_titulo?: string;
  reserva_nota?: string;
  estado_reserva?: string;
  usuario_id?: number;
  estaciones?: number[];
  equipos?: Array<{ id: number; nombre: string; cantidad: number }>; // ¡Añadir!
}

// ── 3. COMPONENTES PERSONALIZADOS DEL CALENDARIO ──
const CustomHeader = ({ date }: { date: Date }) => {
  const esHoy = isToday(date);
  return (
    <div className={`custom-header-cell ${esHoy ? 'hoy' : ''}`}>
      <span className="dia-texto">{format(date, 'eee', { locale: es }).toUpperCase()}</span>
      <span className="dia-numero">{format(date, 'dd')}</span>
    </div>
  );
};

const CustomMonthHeader = ({ date }: { date: Date }) => (
  <div className="custom-month-header">{format(date, 'eee', { locale: es }).toUpperCase()}</div>
);

const CustomDateHeader = ({ label, date, isOffRange }: any) => (
  <div className={`custom-date-header ${isToday(date) ? 'hoy' : ''} ${isOffRange ? 'off-range' : ''}`}>
    <span>{label}</span>
  </div>
);

const CustomEvent = ({ event }: any) => (
  <div className='custom-event-content'>
    <span className="event-title">{event.title}</span>
    <span className="event-time">{`${format(event.start, 'h:mm')} - ${format(event.end, 'h:mm')}`}</span>
  </div>
);

const eventStyleGetter = (event: EventoLaboratorio) => {
  let className = 'evento-base';
  if (event.tipo === 'mantenimiento') className += ' evento-mantenimiento';
  else if (event.laboratorio_nombre === 'Lab de Redes') className += ' evento-sistema-teal';
  else if (event.laboratorio_nombre === 'Lab de Computo') className += ' evento-sistema-amarillo';
  else className += ' evento-sistema-teal';
  return { className };
};

// ── 4. BARRA DE HERRAMIENTAS CON BUSCADOR TIPO GOOGLE ──
interface CustomToolbarProps extends ToolbarProps<EventoLaboratorio> {
  eventos: EventoLaboratorio[];
  filtros: any;
  setFiltros: any;
  laboratoriosUnicos: string[];
}

const CustomToolbar = (toolbar: CustomToolbarProps) => {
  const [MenuVistaAbierto, setMenuVistaAbierto] = useState(false);
  const [MenuFiltroAbierto, setMenuFiltroAbierto] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const { irAFecha } = useContext(NavegacionContext);

  const cambiarVista = (nuevaVista: View) => { toolbar.onView(nuevaVista); setMenuVistaAbierto(false); };

  const resultadosBusqueda = terminoBusqueda.trim() === ''
    ? []
    : toolbar.eventos.filter(e => e.title.toLowerCase().includes(terminoBusqueda.toLowerCase()));

  const toggleFiltroActividad = (tipo: 'clases' | 'mantenimientos' | 'reservas') => {
    toolbar.setFiltros((prev: any) => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  const limpiarFiltros = () => {
    toolbar.setFiltros({
      clases: true,
      mantenimientos: true,
      reservas: true,
      laboratorio: 'Todos',
      tipoEspacio: 'Todos'
    });
  };

  return (
    <div className="calendar-toolbar-custom">
      <div className="toolbar-left">
        <button onClick={() => toolbar.onNavigate('TODAY')} className="btn-hoy">Hoy</button>
        <div className="nav-arrows">
          <button onClick={() => toolbar.onNavigate('PREV')} className="btn-icon"><ChevronLeft size={20} /></button>
          <button onClick={() => toolbar.onNavigate('NEXT')} className="btn-icon"><ChevronRight size={20} /></button>
        </div>
        <h2 className="toolbar-label">{toolbar.label}</h2>
      </div>

      <div className="toolbar-right">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text" className="search-input" placeholder="Buscar actividad..."
            value={terminoBusqueda}
            onChange={(e) => { setTerminoBusqueda(e.target.value); setMostrarResultados(true); }}
            onFocus={() => setMostrarResultados(true)}
            onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
          />
          {mostrarResultados && terminoBusqueda.trim() !== '' && (
            <div className="search-results-dropdown">
              {resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.map((evento) => (
                  <div key={evento.id} className="search-result-item" onClick={() => { irAFecha(evento.start); setTerminoBusqueda(''); setMostrarResultados(false); }}>
                    <div className="result-title">{evento.title}</div>
                    <div className="result-date">{format(evento.start, "d 'de' MMM, h:mm a", { locale: es })}</div>
                  </div>
                ))
              ) : (<div className="search-result-empty">No se encontraron actividades</div>)}
            </div>
          )}
        </div>

        <div className="toolbar-actions">
          <div className="dropdown-container">
            <button onClick={() => { setMenuFiltroAbierto(!MenuFiltroAbierto); setMenuVistaAbierto(false); }} className={`btn-view ${MenuFiltroAbierto ? 'active' : ''}`}>
              <Filter size={16} /> Filtro
            </button>
            {MenuFiltroAbierto && (
              <div className="filter-dropdown-menu">
                <div className="filter-header">
                  <span className="filter-title">Filtros</span>
                  <button className="btn-limpiar" onClick={limpiarFiltros}>Limpiar</button>
                </div>
                
                <div className="filter-section">
                  <span className="filter-subtitle">Por Tipo de Actividad</span>
                  <div className="filter-pills">
                    <button 
                      className={`filter-pill ${toolbar.filtros.clases ? 'active-clases' : 'inactive-clases'}`}
                      onClick={() => toggleFiltroActividad('clases')}
                    >
                      <span className="pill-dot dot-clases"></span> Clases
                    </button>
                    <button 
                      className={`filter-pill ${toolbar.filtros.mantenimientos ? 'active-mantenimientos' : 'inactive-mantenimientos'}`}
                      onClick={() => toggleFiltroActividad('mantenimientos')}
                    >
                      <span className="pill-dot dot-mantenimientos"></span> Mantenimientos
                    </button>
                    <button 
                      className={`filter-pill ${toolbar.filtros.reservas ? 'active-reservas' : 'inactive-reservas'}`}
                      onClick={() => toggleFiltroActividad('reservas')}
                    >
                      <span className="pill-dot dot-reservas"></span> Reservas
                    </button>
                  </div>
                </div>

                <div className="filter-section">
                  <span className="filter-subtitle">Por Laboratorio</span>
                  <select 
                    className="filter-select"
                    value={toolbar.filtros.laboratorio}
                    onChange={(e) => toolbar.setFiltros({ ...toolbar.filtros, laboratorio: e.target.value })}
                  >
                    <option value="Todos">Todos</option>
                    {toolbar.laboratoriosUnicos.map((lab, i) => (
                      <option key={i} value={lab}>{lab}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-section">
                  <span className="filter-subtitle">Por Tipo de Espacio</span>
                  <select 
                    className="filter-select"
                    value={toolbar.filtros.tipoEspacio}
                    onChange={(e) => toolbar.setFiltros({ ...toolbar.filtros, tipoEspacio: e.target.value })}
                  >
                    <option value="Todos">Todos</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="dropdown-container">
            <button onClick={() => { setMenuVistaAbierto(!MenuVistaAbierto); setMenuFiltroAbierto(false); }} className="btn-view active">
              {{ month: 'Mes', week: 'Semana', work_week: 'Semana', day: 'Día', agenda: 'Agenda' }[toolbar.view] || 'Vista'}
              {MenuVistaAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {MenuVistaAbierto && (
              <div className="dropdown-menu">
                <button onClick={() => cambiarVista('day')} className="dropdown-item">Día</button>
                <button onClick={() => cambiarVista('week')} className="dropdown-item">Semana</button>
                <button onClick={() => cambiarVista('month')} className="dropdown-item">Mes</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 5. COMPONENTE PRINCIPAL (VISTA) ──
export const CalendarioView = () => {
  const { user } = useAuth();
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vistaActual, setVistaActual] = useState<View>('week');
  const [modalAbierto, setModalAbierto] = useState(false);

  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoLaboratorio | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  const [eventos, setEventos] = useState<EventoLaboratorio[]>([]);
  const [cargando, setCargando] = useState(true);

  // ESTADO NUEVO: Guarda qué actividad se va a editar
  const [actividadAEditar, setActividadAEditar] = useState<EventoLaboratorio | null>(null);

  // ESTADO NUEVO: Filtros del calendario
  const [filtros, setFiltros] = useState({
    clases: true,
    mantenimientos: true,
    reservas: true,
    laboratorio: 'Todos',
    tipoEspacio: 'Todos'
  });

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const data = await obtenerActividades();
      setEventos(data);
    } catch (error) {
      console.error("Error al traer data:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const horasInicio = new Date(); horasInicio.setHours(6, 0, 0);
  const horaFin = new Date(); horaFin.setHours(23, 59, 59);

  const handleSelectEvent = (evento: EventoLaboratorio, e: any) => {
    const evt = e.nativeEvent as MouseEvent;
    if (!evt) return;

    let x = evt.clientX;
    let y = evt.clientY;

    const popoverWidth = 320;
    const popoverHeight = 200;
    if (x + popoverWidth > window.innerWidth) x = x - popoverWidth - 20;
    else x = x + 20;
    if (y + popoverHeight > window.innerHeight) y = y - popoverHeight;

    setPopoverPos({ x, y });
    setEventoSeleccionado(evento);
  };

  // [MODIFICADO] Activamos el modo edición con el evento seleccionado
  const handleEditarEvento = () => {
    if (!eventoSeleccionado) return;
    setActividadAEditar(eventoSeleccionado); // Guardamos la data completa en el estado
    setEventoSeleccionado(null); // Cerramos el popover
    setModalAbierto(true); // Abrimos el modal
  };

  const handleEliminarEvento = async () => {
    if (!eventoSeleccionado) return;

    //Pedimos confirmacion al usuario antes de borrar
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar la actividad "${eventoSeleccionado.title}"?\nEsta acción no se puede deshacer.`);
    if (confirmar) {
      try {
        //llmamos a la Api para elimar
        const resultado = await eliminarActividad(eventoSeleccionado.id);

        //disparamos el Toast verde
        customToast.success('¡Eliminado!', resultado?.message || resultado?.mensaje || 'Actividad eliminada exitosamente');

        //cerramos el popover
        setEventoSeleccionado(null);

        //recargamos la tabla
        await cargarDatos();

      } catch (error: any) {
        console.error("Error al eliminar:", error);
        customToast.error('Error', error.message || 'No se pudo eliminar la actividad');
      }


    }

  };

  // [MODIFICADO] Decide de forma dinámica si guarda un registro nuevo o actualiza uno viejo
  const handleGuardarActividad = async (datosModal: any) => {
    try {
      if (actividadAEditar) {
        // MODO EDICIÓN (PUT)
        console.log("Actualizando actividad existente ID:", actividadAEditar.id, datosModal);
        const resultado = await actualizarActividad(actividadAEditar.id, datosModal);
        customToast.success('¡Modificado!', resultado?.message || resultado?.mensaje || 'Actividad actualizada exitosamente');
      } else {
        // MODO CREACIÓN (POST)
        console.log("Creando nueva actividad:", datosModal);
        const resultado = await crearActividad(datosModal);
        customToast.success('¡Éxito!', resultado?.message || resultado?.mensaje || 'Actividad guardada correctamente');
      }

      setModalAbierto(false);
      setActividadAEditar(null); // Limpiamos el estado de edición siempre
      await cargarDatos();
    } catch (error: any) {
      console.error("Error en la operación del calendario:", error);
      customToast.error('Operación rechazada', error.message || 'Error desconocido');
    }
  };

  // Filtrado de eventos basado en los filtros seleccionados
  const eventosFiltrados = eventos.filter(evento => {
    if (evento.tipo === 'clase' && !filtros.clases) return false;
    if (evento.tipo === 'mantenimiento' && !filtros.mantenimientos) return false;
    if (evento.tipo === 'reserva' && !filtros.reservas) return false;

    if (filtros.laboratorio !== 'Todos' && evento.laboratorio_nombre !== filtros.laboratorio) return false;
    
    // Si existiera "tipoEspacio" en los eventos, se filtraría aquí
    // if (filtros.tipoEspacio !== 'Todos' && evento.tipoEspacio !== filtros.tipoEspacio) return false;
    
    return true;
  });

  const laboratoriosUnicos = Array.from(new Set(eventos.map(e => e.laboratorio_nombre))).filter(Boolean);

  return (
    <NavegacionContext.Provider value={{ irAFecha: (fecha) => setFechaActual(fecha) }}>
      <div className="calendar-page-wrapper" onClick={() => eventoSeleccionado && setEventoSeleccionado(null)}>

        {cargando && <div className="loading-overlay">Cargando base de datos smartlabs...</div>}

        {eventoSeleccionado && (
          <div
            className="event-popover-container"
            style={{ top: popoverPos.y, left: popoverPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popover-header">
              <div className="popover-actions">
                {(() => {
                  if (!user) return false;
                  if (user.rol === 'administrador') return true;
                  if (user.rol === 'coordinador') {
                    // Si el evento tiene coordinador_id, solo el suyo. Si no, permitir (o denegar según política, aquí mantengo el "String(eventoSeleccionado.coordinador_id) === String(user.id)" de antes)
                    return !eventoSeleccionado.coordinador_id || String(eventoSeleccionado.coordinador_id) === String(user.id);
                  }
                  if (user.rol === 'docente') {
                    // Docente solo puede editar/eliminar si es una reserva y le pertenece
                    return eventoSeleccionado.tipo === 'reserva' && String(eventoSeleccionado.usuario_id) === String(user.id);
                  }
                  return false;
                })() && (
                  <>
                    <button className="btn-popover-action" onClick={handleEditarEvento} title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-popover-action btn-delete" onClick={handleEliminarEvento} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button className="btn-popover-action" onClick={() => setEventoSeleccionado(null)} title="Cerrar">
                  <X size={18} />
                </button>
              </div>

              <h3 className="popover-title">{eventoSeleccionado.title}</h3>
              <p className="popover-time">
                {format(eventoSeleccionado.start, "EEEE d 'de' MMMM • h:mm a", { locale: es })} - {format(eventoSeleccionado.end, 'h:mm a')}
              </p>
            </div>

            <div className="popover-body">
              {/* 1. Aquí cambiamos .laboratorio por .laboratorio_nombre */}
              <div className="popover-row">
                <CalendarIcon size={16} className="popover-icon" />
                <span>{eventoSeleccionado.laboratorio_nombre}</span>
              </div>

              {eventoSeleccionado.tipo === 'clase' && (
                <>
                  <div className="popover-row"><FileText size={16} className="popover-icon" /> <span>Materia: {eventoSeleccionado.materia}</span></div>
                  {/* 2. Aquí quitamos el ID y ponemos el nombre del Docente */}
                  <div className="popover-row"><User size={16} className="popover-icon" /> <span>Docente: {eventoSeleccionado.docente_nombre || 'No asignado'}</span></div>
                </>
              )}

              {eventoSeleccionado.tipo === 'mantenimiento' && (
                <>
                  {/* 3. Aquí quitamos el ID y ponemos el nombre del Técnico */}
                  <div className="popover-row"><Wrench size={16} className="popover-icon text-red" /> <span>Técnico: {eventoSeleccionado.tecnico_nombre || 'No asignado'}</span></div>
                  <div className="popover-row"><FileText size={16} className="popover-icon" /> <span className="text-sm">{eventoSeleccionado.mant_descripcion}</span></div>
                </>
              )}

              {eventoSeleccionado.tipo === 'reserva' && (
                <>
                  <div className="popover-row"><User size={16} className="popover-icon" /> <span>Reserva: {eventoSeleccionado.reserva_titulo}</span></div>
                  <div className="popover-row"><FileText size={16} className="popover-icon" /> <span className="text-sm">Nota: {eventoSeleccionado.reserva_nota}</span></div>

                  {/* Estaciones Reservadas */}
                  {eventoSeleccionado.estaciones && eventoSeleccionado.estaciones.length > 0 && (
                    <div className="popover-row">
                      <span className="text-sm text-gray-700">🖥️ Estaciones: {eventoSeleccionado.estaciones.join(', ')}</span>
                    </div>
                  )}

                  {/* 4. EL INVENTARIO: Aquí inyectamos la lista dinámica de equipos */}
                  {eventoSeleccionado.equipos && eventoSeleccionado.equipos.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        📦 MATERIALES SOLICITADOS:
                      </p>
                      <ul className="space-y-1">
                        {eventoSeleccionado.equipos.map((equipo: any) => (
                          <li key={equipo.id} className="text-sm text-gray-700 flex justify-between bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            <span>• {equipo.nombre}</span>
                            <strong className="text-indigo-600">Cant: {equipo.cantidad}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}

        {/* [MODIFICADO] Le pasamos los datos del evento si es edición, y limpiamos el estado al cerrar */}
        {modalAbierto && (
          <ModalNuevaActividad
            onClose={() => { setModalAbierto(false); setActividadAEditar(null); }}
            onGuardar={handleGuardarActividad}
            actividadExistente={actividadAEditar} // Prop opcional que usaremos en el modal
          />
        )}

        <div className="calendar-main-container">
          <Calendar
            localizer={localizer}
            events={eventosFiltrados}
            startAccessor="start" endAccessor="end"
            date={fechaActual} onNavigate={setFechaActual}
            view={vistaActual} onView={setVistaActual}
            min={horasInicio} max={horaFin}
            formats={{ timeGutterFormat: 'h a' }} culture="es"
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            components={{
              toolbar: (props) => <CustomToolbar {...props} eventos={eventos} filtros={filtros} setFiltros={setFiltros} laboratoriosUnicos={laboratoriosUnicos} />,
              week: { header: CustomHeader }, day: { header: CustomHeader },
              month: { header: CustomMonthHeader, dateHeader: CustomDateHeader }, event: CustomEvent
            }}
            style={{ height: '100%' }}
          />
        </div>

        <div className="calendar-sidebar-right">
          <button className="btn-crear" onClick={() => setModalAbierto(true)}>
            <Plus size={20} /> Crear
          </button>

          <PanelSolicitudes />

          <button className="btn-exportar"><Printer size={20} /> Exportar</button>
        </div>
      </div>
    </NavegacionContext.Provider>
  );
};