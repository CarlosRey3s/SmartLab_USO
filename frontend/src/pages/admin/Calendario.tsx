import { useState, useEffect, createContext, useContext } from 'react';
import {
  Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Plus, Printer, X, User, Wrench, FileText, Info,
  Edit2, Trash2
} from 'lucide-react';
import { Calendar, dateFnsLocalizer, type ToolbarProps, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isToday } from 'date-fns';
import { MiniCalendario } from './MiniCalendario.tsx';
import { es } from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ModalNuevaActividad } from '../../components/shared/ModalNuevaActividad';
import { obtenerActividades } from '../../services/actividades.service'; // <-- Ajusta esta ruta según tus carpetas
import '../../css/calendario.css';

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
  laboratorio: string;
  tipo: 'clase' | 'mantenimiento' | 'reserva';
  materia?: string;
  docente_id?: string;
  clase_estudiantes?: number;
  tecnico_responsable?: string;
  mant_descripcion?: string;
  reserva_titulo?: string;
  reserva_nota?: string;
  estado_reserva?: string;
}

const LABORATORIOS_DISPONIBLES = ['Lab de Redes', 'Lab de Computo'];

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
  else if (event.laboratorio === 'Lab de Redes') className += ' evento-sistema-teal';
  else if (event.laboratorio === 'Lab de Computo') className += ' evento-sistema-amarillo';
  return { className };
};

// ── 4. BARRA DE HERRAMIENTAS (TOOLBAR INTERNA) ──
// Pasamos un prop ficticio para que el filtro interno de Toolbar no falle si no hay eventos cargados aún
const CustomToolbar = (toolbar: ToolbarProps<EventoLaboratorio>) => {
  const [MenuVistaAbierto, setMenuVistaAbierto] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const { irAFecha } = useContext(NavegacionContext);

  const cambiarVista = (nuevaVista: View) => { toolbar.onView(nuevaVista); setMenuVistaAbierto(false); };

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
        </div>

        <div className="dropdown-container">
          <button onClick={() => setMenuVistaAbierto(!MenuVistaAbierto)} className="btn-view active">
            {{ month: 'Mes', week: 'Semana', work_week: 'Semana', day: 'Día' }[toolbar.view] || 'Vista'}
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
  );
};

// ── 5. COMPONENTE PRINCIPAL (VISTA) ──
export const CalendarioView = () => {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vistaActual, setVistaActual] = useState<View>('week');
  const [labsActivos, setLabsActivos] = useState<string[]>(LABORATORIOS_DISPONIBLES);
  const [menuDesplegado, setMenuDesplegado] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoLaboratorio | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  const [eventos, setEventos] = useState<EventoLaboratorio[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
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
    cargarDatos();
  }, []);

  const horasInicio = new Date(); horasInicio.setHours(6, 0, 0);
  const horaFin = new Date(); horaFin.setHours(23, 59, 59);

  const toggleLaboratorio = (nombreLab: string) => {
    setLabsActivos(prev => prev.includes(nombreLab) ? prev.filter(lab => lab !== nombreLab) : [...prev, nombreLab]);
  };

  const eventosFiltrados = eventos.filter(evento => labsActivos.includes(evento.laboratorio));

  // ── SOLUCIÓN IMAGEN 1: Cambiamos el tipo del evento nativo a 'any' para evitar colisiones ──
  const handleSelectEvent = (evento: EventoLaboratorio, e: any) => {
    const evt = e.nativeEvent as MouseEvent;

    // Si el evento viene de un clic directo en un botón interno (como borrar), no abras el popover
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

  const handleEditarEvento = () => {
    console.log("Editar ID:", eventoSeleccionado?.id);
  };

  const handleEliminarEvento = () => {
    console.log("Eliminar ID:", eventoSeleccionado?.id);
  };

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
                <button className="btn-popover-action" onClick={handleEditarEvento} title="Editar">
                  <Edit2 size={16} />
                </button>
                <button className="btn-popover-action btn-delete" onClick={handleEliminarEvento} title="Eliminar">
                  <Trash2 size={16} />
                </button>
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
              <div className="popover-row">
                <CalendarIcon size={16} className="popover-icon" />
                <span>{eventoSeleccionado.laboratorio}</span>
              </div>

              {eventoSeleccionado.tipo === 'clase' && (
                <>
                  <div className="popover-row"><FileText size={16} className="popover-icon" /> <span>Materia: {eventoSeleccionado.materia}</span></div>
                  <div className="popover-row"><User size={16} className="popover-icon" /> <span>Docente ID: {eventoSeleccionado.docente_id}</span></div>
                </>
              )}

              {eventoSeleccionado.tipo === 'mantenimiento' && (
                <>
                  <div className="popover-row"><Wrench size={16} className="popover-icon text-red" /> <span>Técnico ID: {eventoSeleccionado.tecnico_responsable}</span></div>
                  <div className="popover-row"><FileText size={16} className="popover-icon" /> <span className="text-sm">{eventoSeleccionado.mant_descripcion}</span></div>
                </>
              )}

              {eventoSeleccionado.tipo === 'reserva' && (
                <>
                  <div className="popover-row"><User size={16} className="popover-icon" /> <span>Reserva: {eventoSeleccionado.reserva_titulo}</span></div>
                  <div className="popover-row"><FileText size={16} className="popover-icon" /> <span className="text-sm">Nota: {eventoSeleccionado.reserva_nota}</span></div>
                </>
              )}
            </div>
          </div>
        )}

        {modalAbierto && (
          <ModalNuevaActividad
            onClose={() => setModalAbierto(false)}
            // ── SOLUCIÓN IMAGEN 2: Le asignamos tipo 'any' explícito a la data entrante ──
            onGuardar={async (data: any) => {
              console.log("Data capturada del modal:", data);
            }}
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
              toolbar: CustomToolbar, week: { header: CustomHeader }, day: { header: CustomHeader },
              month: { header: CustomMonthHeader, dateHeader: CustomDateHeader }, event: CustomEvent
            }}
            style={{ height: '100%' }}
          />
        </div>

        <div className="calendar-sidebar-right">
          <button className="btn-crear" onClick={() => setModalAbierto(true)}>
            <Plus size={20} /> Crear
          </button>
          <MiniCalendario fechaSeleccionada={fechaActual} onFechaCambiada={setFechaActual} />

          <div className="mis-laboratorios-card">
            <div className="card-header" onClick={() => setMenuDesplegado(!menuDesplegado)}>
              <div className="card-header-title">
                <CalendarIcon size={18} /> Mis laboratorios
              </div>
              {menuDesplegado ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {menuDesplegado && (
              <div className="card-body">
                {LABORATORIOS_DISPONIBLES.map((lab) => (
                  <label key={lab} className="lab-checkbox-label">
                    <input
                      type="checkbox"
                      checked={labsActivos.includes(lab)}
                      onChange={() => toggleLaboratorio(lab)}
                    />
                    {lab}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="btn-exportar"><Printer size={20} /> Exportar</button>
        </div>
      </div>
    </NavegacionContext.Provider>
  );
};