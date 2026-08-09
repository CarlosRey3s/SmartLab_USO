import { useState, useEffect, createContext, useContext } from 'react';
import { Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Printer, X, User, Users, Wrench, FileText, Edit2, Trash2, Filter, Info } from 'lucide-react';
import { Calendar, dateFnsLocalizer, type ToolbarProps, type View } from 'react-big-calendar';
import { es } from 'date-fns/locale/es';
import { PanelSolicitudes } from './PanelSolicitudes.tsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ModalNuevaActividad } from '../../components/shared/ModalNuevaActividad';
import { obtenerActividades, crearActividad, actualizarActividad, eliminarActividad } from '../../services/actividades.service';
import '../../css/calendario.css';
import { customToast } from '../../components/custom-toast/CustomToast.tsx';
import { useAuth } from '../../context/AuthContext';
import { isReadOnlyView } from '../../utils/roleGuard';
import { format, parse, startOfWeek, getDay, isToday, startOfMonth, endOfMonth, parseISO } from 'date-fns';


// ── 1. CONFIGURACIÓN DE FECHAS E IDIOMA ──
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const NavegacionContext = createContext({ irAFecha: (_fecha: Date) => { } });

const minTime = new Date(); minTime.setHours(6, 0, 0);
const maxTime = new Date(); maxTime.setHours(23, 59, 59);

// ── 2. INTERFAZ PARA EVENTOS (Consulta SQL) ──
export interface EventoLaboratorio {
  id: number;
  title: string;
  start: Date;
  end: Date;
  tipo: 'clase' | 'mantenimiento' | 'reserva';
  laboratorio_id: number;
  laboratorio_nombre: string;
  coordinador_id?: number;
  materia?: string;
  docente_id?: number;
  docente_nombre?: string;
  clase_estudiantes?: number;
  tecnico_responsable?: number;
  tecnico_nombre?: string;
  mant_descripcion?: string;
  reserva_titulo?: string;
  reserva_nota?: string;
  estado_reserva?: string;
  usuario_id?: number;
  reserva_solicitante_nombre?: string;
  reserva_solicitante_apellido?: string;
  reserva_solicitante_expediente?: string;
  estaciones?: number[];
  equipos?: Array<{ id: number; nombre: string; cantidad: number }>;
}

// ── 3. COMPONENTES PERSONALIZADOS DEL CALENDARIO ──
const CustomHeader = ({ date }: { date: Date }) => {
  const esHoy = isToday(date);
  return (
    <div className={`custom-header-cell ${esHoy ? 'hoy' : ''}`}>
      <span className="dia-texto">{format(date, 'eee', { locale: es }).toUpperCase()}</span>
      <span className="dia-numero">{format(date, 'd')}</span>
    </div>
  );
};

const CustomMonthHeader = ({ date }: { date: Date }) => {
  const esColumnaDeHoy = getDay(date) === getDay(new Date());
  return (
    <div className={`custom-month-header ${esColumnaDeHoy ? 'hoy' : ''}`}>{format(date, 'eee', { locale: es }).toUpperCase()}</div>
  );
};

const CustomDateHeader = ({ date, isOffRange }: any) => {
  const isFirstOfMonth = date.getDate() === 1;
  const monthStr = format(date, 'MMM', { locale: es }).toLowerCase();
  // Quitar el punto que a veces pone date-fns
  const cleanMonthStr = monthStr.replace('.', '');
  const dayNumber = format(date, 'd');
  const displayLabel = isFirstOfMonth ? `1 ${cleanMonthStr}` : dayNumber;

  return (
    <div className={`custom-date-header ${isToday(date) ? 'hoy' : ''} ${isOffRange ? 'off-range' : ''}`}>
      <span>{displayLabel}</span>
    </div>
  );
};

const CustomEvent = ({ event }: any) => {
  const diffMs = event.end.getTime() - event.start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const durationStr = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;

  return (
    <div className='custom-event-content'>
      <span className="event-title">{event.title}</span>
      <span className="event-time">
        {`${format(event.start, 'h:mm')} - ${format(event.end, 'h:mm')} • ${durationStr}`}
      </span>
    </div>
  );
};

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
  abrirEventoDelBuscador: (evento: EventoLaboratorio) => void;
}

const CustomToolbar = (toolbar: CustomToolbarProps) => {
  const [MenuVistaAbierto, setMenuVistaAbierto] = useState(false);
  const [MenuFiltroAbierto, setMenuFiltroAbierto] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const { irAFecha } = useContext(NavegacionContext);

  // Estado local para los filtros antes de aplicarlos
  const [filtrosLocales, setFiltrosLocales] = useState(toolbar.filtros);

  useEffect(() => {
    if (MenuFiltroAbierto) {
      setFiltrosLocales(toolbar.filtros);
    }
  }, [MenuFiltroAbierto, toolbar.filtros]);

  const cambiarVista = (nuevaVista: View) => { toolbar.onView(nuevaVista); setMenuVistaAbierto(false); };

  const resultadosBusqueda = terminoBusqueda.trim() === ''
    ? []
    : toolbar.eventos.filter(e => {
      const t = terminoBusqueda.toLowerCase();
      return (
        (e.title || '').toLowerCase().includes(t) ||
        (e.docente_nombre || '').toLowerCase().includes(t) ||
        (e.materia || '').toLowerCase().includes(t) ||
        (e.tecnico_nombre || '').toLowerCase().includes(t) ||
        (e.reserva_titulo || '').toLowerCase().includes(t)
      );
    });

  const toggleFiltroActividadLocal = (tipo: 'clases' | 'mantenimientos' | 'reservas') => {
    setFiltrosLocales((prev: any) => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  const toggleLaboratorioLocal = (lab: string) => {
    setFiltrosLocales((prev: any) => {
      const labs = prev.laboratorios || [];
      if (labs.includes(lab)) {
        return { ...prev, laboratorios: labs.filter((l: string) => l !== lab) };
      } else {
        return { ...prev, laboratorios: [...labs, lab] };
      }
    });
  };

  const aplicarFiltros = () => {
    toolbar.setFiltros(filtrosLocales);
    setMenuFiltroAbierto(false);
  };

  // Obtener conteo de eventos por laboratorio para el menú
  const conteoLaboratorios = toolbar.laboratoriosUnicos.reduce((acc: any, lab) => {
    acc[lab] = toolbar.eventos.filter(e => e.laboratorio_nombre === lab).length;
    return acc;
  }, {});

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
            type="text" className="search-input" placeholder="Buscar actividad, docente, materia..."
            value={terminoBusqueda}
            onChange={(e) => { setTerminoBusqueda(e.target.value); setMostrarResultados(true); }}
            onFocus={() => setMostrarResultados(true)}
            onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
          />
          {mostrarResultados && terminoBusqueda.trim() !== '' && (
            <div className="search-results-dropdown">
              {resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.map((evento) => (
                  <div key={evento.id} className="search-result-item" onClick={() => {
                    irAFecha(evento.start);
                    toolbar.abrirEventoDelBuscador(evento);
                    setTerminoBusqueda('');
                    setMostrarResultados(false);
                  }}>
                    <div className="result-title">{evento.title}</div>
                    <div className="result-info">
                      {evento.docente_nombre && <span className="info-badge doc">{evento.docente_nombre}</span>}
                      {evento.tecnico_nombre && <span className="info-badge tec">{evento.tecnico_nombre}</span>}
                    </div>
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
              <div className="filter-dropdown-menu dark-filter">

                <div className="filter-section">
                  <span className="filter-subtitle dark">TIPO DE ACTIVIDAD</span>
                  <div className="filter-pills-dark">
                    <button
                      className={`dark-pill pill-clases ${filtrosLocales.clases ? 'active' : ''}`}
                      onClick={() => toggleFiltroActividadLocal('clases')}
                    >
                      <span className="pill-dot dot-clases-dark"></span> Clases
                    </button>
                    <button
                      className={`dark-pill pill-reservas ${filtrosLocales.reservas ? 'active' : ''}`}
                      onClick={() => toggleFiltroActividadLocal('reservas')}
                    >
                      <span className="pill-dot dot-reservas-dark"></span> Reservas
                    </button>
                    <button
                      className={`dark-pill pill-mantenimientos ${filtrosLocales.mantenimientos ? 'active' : ''}`}
                      onClick={() => toggleFiltroActividadLocal('mantenimientos')}
                    >
                      <span className="pill-dot dot-mantenimientos-dark"></span> Mantenimientos
                    </button>
                  </div>
                </div>

                <div className="filter-section">
                  <span className="filter-subtitle dark">LABORATORIOS</span>
                  <div className="dark-checkbox-list">
                    {toolbar.laboratoriosUnicos.map((lab, i) => {
                      const isActive = (filtrosLocales.laboratorios || []).includes(lab);
                      return (
                        <div key={i} className={`dark-checkbox-item ${isActive ? 'selected' : ''}`} onClick={() => toggleLaboratorioLocal(lab)}>
                          <div className="checkbox-box">
                            {isActive && <div className="checkbox-check">✓</div>}
                          </div>
                          <span className="checkbox-label">{lab}</span>
                          <span className="checkbox-badge">{conteoLaboratorios[lab] || 0}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="filter-actions">
                  <button className="btn-aplicar-filtros" onClick={aplicarFiltros}>
                    Aplicar filtros ↗
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="dropdown-container">
            <button onPointerDown={(e) => { e.stopPropagation(); setMenuVistaAbierto(!MenuVistaAbierto); setMenuFiltroAbierto(false); }} className="btn-view active">
              {{ month: 'Mes', week: 'Semana', work_week: 'Semana', day: 'Día', agenda: 'Agenda' }[toolbar.view] || 'Vista'}
              {MenuVistaAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {MenuVistaAbierto && (
              <div className="dropdown-menu">
                <button onPointerDown={(e) => { e.stopPropagation(); cambiarVista('day'); }} className="dropdown-item">Día</button>
                <button onPointerDown={(e) => { e.stopPropagation(); cambiarVista('week'); }} className="dropdown-item">Semana</button>
                <button onPointerDown={(e) => { e.stopPropagation(); cambiarVista('month'); }} className="dropdown-item">Mes</button>
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

  // Evaluar si el usuario es autoridad
  const esAutoridad = user?.rol === 'administrador' || user?.rol === 'coordinador';

  const [fechaActual, setFechaActual] = useState(new Date());
  const [vistaActual, setVistaActual] = useState<View>('week');
  const [modalAbierto, setModalAbierto] = useState(false);

  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoLaboratorio | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [popoverDragY, setPopoverDragY] = useState(0);
  const [popoverTouchStartY, setPopoverTouchStartY] = useState<number | null>(null);
  const [isClosingPopover, setIsClosingPopover] = useState(false);

  const cerrarPopover = () => {
    setIsClosingPopover(true);
    setTimeout(() => {
      setEventoSeleccionado(null);
      setIsClosingPopover(false);
      setPopoverDragY(0);
    }, 200); // Mismo tiempo que la transición CSS
  };

  const [eventos, setEventos] = useState<EventoLaboratorio[]>([]);
  const [cargando, setCargando] = useState(true);

  // ESTADO NUEVO: Guarda qué actividad se va a editar
  const [actividadAEditar, setActividadAEditar] = useState<EventoLaboratorio | null>(null);

  // ESTADO NUEVO: Filtros del calendario
  const [filtros, setFiltros] = useState({
    clases: true,
    mantenimientos: true,
    reservas: true,
    laboratorios: [] as string[]
  });

  // Estados para el manejo de Swipe en móviles
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null); // Reset
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe izquierda -> Siguiente periodo
      moverPeriodo(1);
    }
    if (isRightSwipe) {
      // Swipe derecha -> Periodo anterior
      moverPeriodo(-1);
    }
  };

  const moverPeriodo = (direccion: number) => {
    setFechaActual(prev => {
      const nuevaFecha = new Date(prev);
      if (vistaActual === 'month') nuevaFecha.setMonth(prev.getMonth() + direccion);
      else if (vistaActual === 'week' || vistaActual === 'work_week') nuevaFecha.setDate(prev.getDate() + (7 * direccion));
      else if (vistaActual === 'day' || vistaActual === 'agenda') nuevaFecha.setDate(prev.getDate() + direccion);
      return nuevaFecha;
    });
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const fechaInicio = startOfMonth(fechaActual).toISOString();
      const fechaFin = endOfMonth(fechaActual).toISOString();
      const data = await obtenerActividades(fechaInicio, fechaFin);
      const arregloEventos = Array.isArray(data) ? data : (data?.data || []);
      const eventosMapeados = arregloEventos.map((act: any) => {
        const rawStart = act.start || act.fecha_hora_inicio;
        const rawEnd = act.end || act.fecha_hora_fin;

        return {
          ...act,
          id: act.id_instancia || act.id,
          idOriginal: act.id,
          title: act.title || (act.tipo === 'clase' ? act.materia : act.tipo === 'mantenimiento' ? 'Mantenimiento' : act.titulo),
          start: parseISO(rawStart),
          end: parseISO(rawEnd),
          tipo: act.tipo,
          laboratorio_id: act.laboratorio_id,
          laboratorio_nombre: act.laboratorio_nombre || 'Laboratorio',
        };
      });

      console.log("🚀 Eventos mapeados con éxito para React:", eventosMapeados);
      setEventos(eventosMapeados);
    } catch (error) {
      console.error('Error al cargar eventos en el componente:', error);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    cargarDatos();
  }, [fechaActual]);

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

  const abrirEventoDelBuscador = (evento: EventoLaboratorio) => {
    // Abrimos el popover centrado o en una posición fija si viene del buscador
    const x = Math.max((window.innerWidth / 2) - 160, 20);
    const y = Math.max((window.innerHeight / 2) - 100, 20);
    setPopoverPos({ x, y });
    setEventoSeleccionado(evento);
  };

  const handleEditarEvento = () => {
    if (!eventoSeleccionado) return;
    setActividadAEditar(eventoSeleccionado);
    setEventoSeleccionado(null);
    setModalAbierto(true);
  };

  const handleEliminarEvento = async () => {
    if (!eventoSeleccionado) return;

    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar la actividad "${eventoSeleccionado.title}"?\nEsta acción no se puede deshacer.`);
    if (confirmar) {
      try {
        // Enviar el ID original de la base de datos (no la instancia clonada)
        const idAEliminar = (eventoSeleccionado as any).idOriginal || eventoSeleccionado.id;
        const resultado = await eliminarActividad(idAEliminar);

        customToast.success('¡Eliminado!', resultado?.message || resultado?.mensaje || 'Actividad eliminada exitosamente');
        setEventoSeleccionado(null);
        await cargarDatos();

      } catch (error: any) {
        console.error("Error al eliminar:", error);
        customToast.error('Error', error.message || 'No se pudo eliminar la actividad');
      }
    }
  };

  const handleGuardarActividad = async (datosModal: any) => {
    try {
      if (actividadAEditar) {
        const idAEditar = (actividadAEditar as any).idOriginal || actividadAEditar.id;
        console.log("Actualizando actividad existente ID:", idAEditar, datosModal);
        const resultado = await actualizarActividad(idAEditar, datosModal);
        customToast.success('¡Modificado!', resultado?.message || resultado?.mensaje || 'Actividad actualizada exitosamente');
      } else {
        console.log("Creando nueva actividad:", datosModal);
        const resultado = await crearActividad(datosModal);
        customToast.success('¡Éxito!', resultado?.message || resultado?.mensaje || 'Actividad guardada correctamente');
      }

      setModalAbierto(false);
      setActividadAEditar(null);
      await cargarDatos();
    } catch (error: any) {
      console.error("Error en la operación del calendario:", error);
      customToast.error('Operación rechazada', error.message || 'Error desconocido');
    }
  };

  const eventosFiltrados = eventos.filter(evento => {
    if (evento.tipo === 'clase' && !filtros.clases) return false;
    if (evento.tipo === 'mantenimiento' && !filtros.mantenimientos) return false;
    if (evento.tipo === 'reserva' && !filtros.reservas) return false;

    if (filtros.laboratorios && filtros.laboratorios.length > 0) {
      if (!filtros.laboratorios.includes(evento.laboratorio_nombre)) return false;
    }

    return true;
  });

  const laboratoriosUnicos = Array.from(new Set(eventos.map(e => e.laboratorio_nombre))).filter(Boolean);


  // Función para exportar ÚNICAMENTE el Horario Académico de Clases (Materia + Docente por celda)
  const exportarACSV = () => {
    if (!eventos || eventos.length === 0) {
      alert('No hay actividades en la vista actual para exportar.');
      return;
    }

    // 1. FILTRO PRINCIPAL: Filtrar únicamente los eventos de tipo 'clase'
    const clases = eventos.filter(evento => evento.tipo === 'clase');

    if (clases.length === 0) {
      alert('No hay clases académicas programadas en la vista actual para exportar.');
      return;
    }

    // 2. Encabezados de las columnas del Horario Institucional
    const cabeceras = ['HORA', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

    // 3. Franjas horarias académicas de 07:00 a 21:00
    const franjasHorarias = [
      { horaInicio: 7, horaFin: 8, label: '07:00 - 08:00' },
      { horaInicio: 8, horaFin: 9, label: '08:00 - 09:00' },
      { horaInicio: 9, horaFin: 10, label: '09:00 - 10:00' },
      { horaInicio: 10, horaFin: 11, label: '10:00 - 11:00' },
      { horaInicio: 11, horaFin: 12, label: '11:00 - 12:00' },
      { horaInicio: 12, horaFin: 13, label: '12:00 - 13:00' },
      { horaInicio: 13, horaFin: 14, label: '13:00 - 14:00' },
      { horaInicio: 14, horaFin: 15, label: '14:00 - 15:00' },
      { horaInicio: 15, horaFin: 16, label: '15:00 - 16:00' },
      { horaInicio: 16, horaFin: 17, label: '16:00 - 17:00' },
      { horaInicio: 17, horaFin: 18, label: '17:00 - 18:00' },
      { horaInicio: 18, horaFin: 19, label: '18:00 - 19:00' },
      { horaInicio: 19, horaFin: 20, label: '19:00 - 20:00' },
      { horaInicio: 20, horaFin: 21, label: '20:00 - 21:00' }
    ];

    const diasSemanaMap = [1, 2, 3, 4, 5, 6]; // 1 = Lunes ... 6 = Sábado

    // 4. Construir la matriz horaria
    const filasMatriz = franjasHorarias.map(franja => {
      const celdas = [franja.label];

      diasSemanaMap.forEach(diaNum => {
        // Filtrar solo las CLASES que caen en este día y franja horaria
        const clasesEnBloque = clases.filter(evento => {
          const fInicio = new Date(evento.start);
          const fFin = new Date(evento.end);

          if (fInicio.getDay() !== diaNum) return false;

          const horaInicioEvento = fInicio.getHours() + fInicio.getMinutes() / 60;
          const horaFinEvento = fFin.getHours() + fFin.getMinutes() / 60;

          return (horaInicioEvento < franja.horaFin && horaFinEvento > franja.horaInicio);
        });

        if (clasesEnBloque.length > 0) {
          // Formatear Materia y Docente en renglones separados dentro de la misma celda
          const representaciones = clasesEnBloque.map(c => {
            const materia = c.materia || c.title || 'Clase';
            const docente = c.docente_nombre ? `Docente: ${c.docente_nombre}` : 'Sin docente asignado';
            const lab = c.laboratorio_nombre ? ` [${c.laboratorio_nombre}]` : '';

            // Inyectamos el salto de línea (\n) entre la materia y el docente
            return `${materia}${lab}\n${docente}`;
          });

          // Deduplicar instancias repetidas
          const clasesUnicas = Array.from(new Set(representaciones));

          // Escapar comillas dobles y concatenar
          const contenidoCelda = clasesUnicas.join('\n---\n').replace(/"/g, '""');

          celdas.push(`"${contenidoCelda}"`);
        } else {
          celdas.push('""'); // Espacio libre
        }
      });

      return celdas.join(';');
    });

    // 5. Encabezado institucional + tabla
    const csvContent = [cabeceras.join(';'), ...filasMatriz].join('\n');

    // 6. Generar y descargar el archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Horario_Academico_Clases_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ANTES DEL RETURN
  return (
    <NavegacionContext.Provider value={{ irAFecha: (fecha) => setFechaActual(fecha) }}>
      <div className="calendar-page-wrapper" onClick={() => eventoSeleccionado && cerrarPopover()}>
        {cargando && <div className="loading-overlay">Cargando base de datos smartlabs...</div>}
        {eventoSeleccionado && (
          <>
            {/* Overlay oscuro para móvil */}
            <div className={`popover-mobile-overlay ${isClosingPopover ? 'closing' : ''}`} onClick={() => cerrarPopover()} />
            <div
              className={`event-popover-container ${isClosingPopover ? 'closing' : ''}`}
              style={{
                top: popoverPos.y,
                left: popoverPos.x,
                ...(popoverDragY > 0 ? { transform: `translateY(${popoverDragY}px)`, transition: 'none' } : {})
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                setPopoverTouchStartY(e.targetTouches[0].clientY);
                setPopoverDragY(0);
              }}
              onTouchMove={(e) => {
                if (popoverTouchStartY === null) return;
                const diff = e.targetTouches[0].clientY - popoverTouchStartY;
                if (diff > 0) setPopoverDragY(diff); // Solo hacia abajo
              }}
              onTouchEnd={() => {
                if (popoverDragY > 100) {
                  cerrarPopover(); // Cerrar si arrastró más de 100px
                } else {
                  setPopoverDragY(0); // Snap back suave
                }
                setPopoverTouchStartY(null);
              }}
            >
              {/* Barra de arrastre para móvil */}
              <div className="popover-drag-handle"><div className="drag-bar" /></div>

              <div className="popover-header">
                <div className="popover-actions">
                  {(() => {
                    if (!user) return false;
                    if (user.rol === 'administrador') return true;
                    if (user.rol === 'coordinador') {
                      return !eventoSeleccionado.coordinador_id || String(eventoSeleccionado.coordinador_id) === String(user.id);
                    }
                    if (user.rol === 'docente') {
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
                  <button className="btn-popover-action" onClick={() => cerrarPopover()} title="Cerrar">
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
                  <span>{eventoSeleccionado.laboratorio_nombre}</span>
                </div>

                {eventoSeleccionado.tipo === 'clase' && (
                  <>
                    <div className="popover-row"><FileText size={16} className="popover-icon" /> <span>Materia: {eventoSeleccionado.materia}</span></div>
                    <div className="popover-row"><User size={16} className="popover-icon" /> <span>Docente: {eventoSeleccionado.docente_nombre || 'No asignado'}</span></div>
                    {eventoSeleccionado.clase_estudiantes != null && (
                      <div className="popover-row"><Users size={16} className="popover-icon" /> <span>Estudiantes: {eventoSeleccionado.clase_estudiantes}</span></div>
                    )}
                  </>
                )}

                {eventoSeleccionado.tipo === 'mantenimiento' && (
                  <>
                    <div className="popover-row"><Wrench size={16} className="popover-icon text-red" /> <span>Técnico: {eventoSeleccionado.tecnico_nombre || 'No asignado'}</span></div>
                    <div className="popover-row"><FileText size={16} className="popover-icon" /> <span className="text-sm">{eventoSeleccionado.mant_descripcion}</span></div>
                  </>
                )}

                {eventoSeleccionado.tipo === 'reserva' && (
                  <>
                    {eventoSeleccionado.reserva_solicitante_nombre && (
                      <div className="popover-row">
                        <User size={16} className="popover-icon" />
                        <span>Reservado por: {eventoSeleccionado.reserva_solicitante_nombre} {eventoSeleccionado.reserva_solicitante_apellido} ({eventoSeleccionado.reserva_solicitante_expediente})</span>
                      </div>
                    )}
                    {eventoSeleccionado.reserva_nota && (
                      <div className="popover-row"><FileText size={16} className="popover-icon" /> <span className="text-sm">Nota: {eventoSeleccionado.reserva_nota}</span></div>
                    )}
                    {eventoSeleccionado.estado_reserva && (
                      <div className="popover-row">
                        <Info size={16} className="popover-icon" />
                        <span>
                          Estado:{' '}
                          <span className={`estado-badge estado-${eventoSeleccionado.estado_reserva.toLowerCase()}`}>
                            {eventoSeleccionado.estado_reserva.toUpperCase()}
                          </span>
                        </span>
                      </div>
                    )}

                    {eventoSeleccionado.estaciones && eventoSeleccionado.estaciones.length > 0 && (
                      <div className="popover-section">
                        <div className="flex justify-between items-center mb-1">
                          <p className="popover-section-title mb-0">
                            🖥️ ESTACIONES RESERVADAS:
                          </p>
                          <span className="text-xs font-bold text-gray-500">Total: {eventoSeleccionado.estaciones.length}</span>
                        </div>
                        <div className="estaciones-grid mt-1">
                          {eventoSeleccionado.estaciones.map((est: number) => (
                            <div key={est} className="estacion-badge">
                              {est}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
          </>
        )}
        {modalAbierto && (
          <ModalNuevaActividad
            onClose={() => { setModalAbierto(false); setActividadAEditar(null); }}
            onGuardar={handleGuardarActividad}
            actividadExistente={actividadAEditar}
          />
        )}
        <div
          className="calendar-main-container"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Calendar
            localizer={localizer}
            events={eventosFiltrados}
            startAccessor="start" endAccessor="end"
            date={fechaActual} onNavigate={setFechaActual}
            view={vistaActual} onView={setVistaActual}
            min={minTime} /* [CORREGIDO] Variables externas */
            max={maxTime} /* [CORREGIDO] Variables externas */
            formats={{ timeGutterFormat: 'h a', eventTimeRangeFormat: () => '' }} culture="es"
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            components={{
              toolbar: (props) => <CustomToolbar {...props} eventos={eventos} filtros={filtros} setFiltros={setFiltros} laboratoriosUnicos={laboratoriosUnicos} abrirEventoDelBuscador={abrirEventoDelBuscador} />,
              week: { header: CustomHeader }, day: { header: CustomHeader },
              month: { header: CustomMonthHeader, dateHeader: CustomDateHeader }, event: CustomEvent
            }}
            style={{ height: '100%' }}
          />
        </div>
        <div className="calendar-sidebar-right">
          {(!user || !isReadOnlyView(user.rol as any)) && (
            <button className="btn-crear" onClick={() => setModalAbierto(true)}>
              <Plus size={20} /> <span className="btn-crear-text">Crear</span>
            </button>
          )}
          <PanelSolicitudes />
          {esAutoridad && (
            <button className="btn-exportar"
              onClick={exportarACSV} title="Exportar actividades a Excel">
              <Printer size={20} /> Exportar Horarios
            </button>
          )}
        </div>
      </div>
    </NavegacionContext.Provider>
  );
};