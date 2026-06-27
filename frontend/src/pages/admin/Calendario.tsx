import { useState } from 'react';
import { Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Printer } from 'lucide-react';
import { Calendar, dateFnsLocalizer, type ToolbarProps, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isToday } from 'date-fns';
// Ajusta la ruta './components/MiniCalendario' según la estructura de tus carpetas
import { MiniCalendario } from './MiniCalendario.tsx';
import { es } from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
// Importa tu nuevo modal (ajusta la ruta según donde tengas CalendarioView)
import { ModalNuevaActividad } from '../../components/shared/ModalNuevaActividad';
import '../../css/calendario.css';

import { formatDistanceStrictWithOptions } from 'date-fns/fp';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// ── 1. AGREGAMOS A QUÉ LABORATORIO PERTENECE CADA EVENTO ──
export interface EventoLaboratorio {
  title: string;
  start: Date;
  end: Date;
  laboratorio: string; // <-- NUEVO: Para saber de qué lab es el evento
}

// Lista de todos nuestros laboratorios que existen
const LABORATORIOS_DISPONIBLES = ['Lab de Redes', 'Lab de Computo'];

// Eventos de prueba con su respectivo laboratorio asignado
const eventosPrueba: EventoLaboratorio[] = [
  {
    title: 'Clase de Cisco CCNA',
    start: new Date(2026, 3, 15, 9, 0),
    end: new Date(2026, 3, 15, 12, 0),
    laboratorio: 'Lab de Redes'
  },
  {
    title: 'Mantenimiento de Servidores',
    start: new Date(2026, 3, 16, 14, 0),
    end: new Date(2026, 3, 16, 17, 0),
    laboratorio: 'Lab de Redes'
  },
  {
    title: 'Clase de Programación III',
    start: new Date(2026, 3, 15, 13, 0),
    end: new Date(2026, 3, 15, 16, 0),
    laboratorio: 'Lab de Computo'
  }
];

const CustomHeader = ({date}: {date: Date}) => {
  //obtenemos el dia en texto corto y lo pasamos a mayusculas
  const diaStr = format(date, 'eee',{locale: es}).toUpperCase();
  //obtenemos solo el numero del dia
  const numStr = format(date,'dd');
  //verificamos si esta columna corresponde al dia de hoy
  const esHoy = isToday(date);


return (
    <div className={`custom-header-cell ${esHoy ? 'hoy' : ''}`}>
      <span className="dia-texto">{diaStr}</span>
      <span className="dia-numero">{numStr}</span>
    </div>
  );
};

// ── NUEVO COMPONENTE: CABECERA SOLO PARA EL MES ──
// Esta solo muestra el texto "LUN", "MAR", sin números ni círculos
const CustomMonthHeader = ({ date }: { date: Date }) => {
  const diaStr = format(date, 'eee', { locale: es }).toUpperCase();
  return (
    <div style={{ padding: '8px 0', fontSize: '0.75rem', fontWeight: 500, color: '#70757a', letterSpacing: '0.5px' }}>
      {diaStr}
    </div>
  );
};

// nuevo componente numero del dia en vista de mes
const CustomDateHeader = ({ label, date, isOffRange }: any) => {
  const esHoy = isToday(date);
  return (
    <div className={`custom-date-header ${esHoy ? 'hoy' : ''} ${isOffRange ? 'off-range' : ''}`}>
    <span>{label}</span> 
    </div>
  );
};

//NUEVO COMPONENTE: TEXTO DENTRO DEL EVENTO
const CustomEvent= ({ event}: any ) => {
  // formateamos la hora de inicio para que se vea asi "9:00"
  const horaInicio = format(event.start, 'h:mm');

  return (
    <div className='custom-event-content'>
      <span className="event-title">{event.title}</span>
      <span className="event-time">{horaInicio}</span>
    </div>
  );
};
 
//colores dinamicos del evento 
const eventStyleGetter = (event: EventoLaboratorio) =>{
  //colores por defecto
  let backgroundColor = '#ffffff';
  let borderColor = '#d1d5db';
  let colorMargenIzquierdo = '#9ca3af';

// Asignamos colores según el laboratorio para distinguirlos rápido
  if (event.laboratorio === 'Lab de Redes') {
    backgroundColor = '#eff6ff'; // Azul muy claro
    borderColor = '#bfdbfe';
    colorMargenIzquierdo = '#3b82f6'; // Azul fuerte
  } else if (event.laboratorio === 'Lab de Computo') {
    backgroundColor = '#f0fdf4'; // Verde muy claro
    borderColor = '#bbf7d0';
    colorMargenIzquierdo = '#22c55e'; // Verde fuerte
  }
return {
    style: {
      backgroundColor,
      color: '#374151', // Texto gris oscuro para que sea legible
      border: `1px solid ${borderColor}`,
      borderLeft: `4px solid ${colorMargenIzquierdo}`, // La rayita gruesa de color a la izquierda
      borderRadius: '4px',
      display: 'block',
      fontSize: '0.75rem',
      padding: '2px 4px',
    }
  };
};
const CustomToolbar = (toolbar: ToolbarProps<EventoLaboratorio>) => {
  // estado local para abrir/cerrar el menu de vistas
  const [MenuVistaAbierto, setMenuVistaAbierto] = useState(false);

  const irAHoy = () => toolbar.onNavigate('TODAY');
  const irAtras = () => toolbar.onNavigate('PREV');
  const irAdelante = () => toolbar.onNavigate('NEXT');
  const vistaActual = toolbar.view;

  // Un diccionario para traducir el nombre de la vista actual
  const nombreVistas: Record<string, string> = {
    month: 'Mes',
    week: 'Semana',
    work_week: 'Semana',
    day: 'Día' // Corregido el acento
  };

  // Función para cambiar de vista y cerrar el menú automáticamente
  const cambiarVista = (nuevaVista: View) => {
    toolbar.onView(nuevaVista);
    setMenuVistaAbierto(false);
  };

  return (
    <div className="calendar-toolbar-custom">
      <div className="toolbar-left">
        <button onClick={irAHoy} className="btn-hoy">Hoy</button>
        <div className="nav-arrows">
          <button onClick={irAtras} className="btn-icon"><ChevronLeft size={20} /></button>
          <button onClick={irAdelante} className="btn-icon"><ChevronRight size={20} /></button>
        </div>
        <h2 className="toolbar-label">{toolbar.label}</h2>
      </div>

      <div className="toolbar-right">
        <button className="btn-search"><Search size={18} /></button>

        {/* ── CONTENEDOR RELATIVO (El Ancla) ── */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          
          {/* El Botón que muestra la vista actual */}
          <button
            onClick={() => setMenuVistaAbierto(!MenuVistaAbierto)}
            className="btn-view active"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {nombreVistas[vistaActual] || 'Vista'}
            {MenuVistaAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* ── EL MENÚ FLOTANTE (Forzado con estilos en línea) ── */}
          {MenuVistaAbierto && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: '0',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              width: '140px',
              zIndex: 99999 /* Esto asegura que NADA lo tape */
            }}>
              <button
                onClick={() => cambiarVista('day')}
                className={`dropdown-item ${vistaActual === 'day' ? 'active' : ''}`}
              >
                Día
              </button>
              <button
                onClick={() => cambiarVista('week')}
                className={`dropdown-item ${vistaActual === 'week' ? 'active' : ''}`}
              >
                Semana
              </button>
              <button
                onClick={() => cambiarVista('month')}
                className={`dropdown-item ${vistaActual === 'month' ? 'active' : ''}`}
              >
                Mes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CalendarioView = () => {
  const [fechaActual, setFechaActual] = useState(new Date(2026, 3, 15));
  const [vistaActual, setVistaActual] = useState<View>('week');
  // ── 2. NUEVOS ESTADOS PARA LOS LABORATORIOS ──
  // Estado para saber qué laboratorios están marcados (por defecto, todos)
  const [labsActivos, setLabsActivos] = useState<string[]>(LABORATORIOS_DISPONIBLES);
  // Estado para saber si el menú está desplegado o contraído
  const [menuDesplegado, setMenuDesplegado] = useState(true);

  // Añade este nuevo estado para controlar el modal:
  const [modalAbierto, setModalAbierto] = useState(false);

  // 1 configuracion del rango de horas
  //empieza a las 6:00 AM
  const horasInicio =  new Date();
  horasInicio.setHours(6, 0, 0);

  //termino a las 11:59 PM
  const horaFin = new Date();
  horaFin.setHours(23, 59, 59);

  // Configuramos el formato de texto
  // 'h a' le dice a date-fns que use "hora y AM/PM" (ej. "8 a. m.") sin minutos
  const formatosPerzonalizados ={
    timeGutterFormat: 'h a'
  };


  // ── 3. LÓGICA DE FILTRADO Y MANEJO DE CLICS ──
  // Esta función decide qué pasa cuando le damos clic a un checkbox
  const toggleLaboratorio = (nombreLab: string) => {
    setLabsActivos((prev) => {
      // Si el laboratorio ya estaba marcado, lo quitamos de la lista
      if (prev.includes(nombreLab)) {
        return prev.filter(lab => lab !== nombreLab);
      }
      // Si no estaba marcado, lo agregamos a la lista
      else {
        return [...prev, nombreLab];
      }
    });
  };

  // MAGIA DE FILTRADO: Solo le pasamos al calendario los eventos cuyo laboratorio esté en "labsActivos"
  const eventosFiltrados = eventosPrueba.filter(evento => 
    labsActivos.includes(evento.laboratorio)
  );

  return (
    <div className="calendar-page-wrapper">
      {/* Añade el modal en cualquier parte superior del return */}
    {modalAbierto && (
        <ModalNuevaActividad 
          onClose={() => setModalAbierto(false)} 
          onGuardar={async (data) => {
            console.log("Datos listos para enviar al backend:", data);

            try {
              // Aquí iría tu lógica para enviar 'data' al backend
              const respuesta = await fetch('http://localhost:4000/api/actividades', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
              });
              //convertimos la respuesta del backend a json
              const resultado = await respuesta.json();
               if( respuesta.ok) {
                console.log("Actividadcreada con exito:", resultado);
                // Opcional: aqui podra disparar una recarga de eventos en el calendario
               }else{
                console.error("Error al crear actividad:", resultado);
                alert("Error al crear actividad: " + resultado.message);
               }

            } catch (error) {
              console.error("Error al enviar datos al backend:", error);
              alert("No se pudo conectar con el servidor para crear la actividad.");
            }
          }}
        />
      )}
      <div className="calendar-main-container">
        <Calendar
          localizer={localizer}
          events={eventosFiltrados} // Le pasamos la lista FILTRADA, no la original
          startAccessor="start"
          endAccessor="end"
          date={fechaActual}
          onNavigate={(nuevaFecha) => setFechaActual(nuevaFecha)}
          view={vistaActual}
          onView={(nuevaVista) => setVistaActual(nuevaVista)}

        // aplicar cambios
        min={horasInicio}
        max={horaFin}
        formats={formatosPerzonalizados}
          culture="es"
          eventPropGetter={eventStyleGetter}
          components={{ toolbar: CustomToolbar,
            week:{header:CustomHeader},
            day: {header: CustomHeader},
            month:{header:CustomMonthHeader,
                  dateHeader: CustomDateHeader
            },
            //Pasandole el diseño del texto a todas las vistas
            event:CustomEvent
          }}
          style={{ height: '100%' }}
        />
      </div>

      <div className="calendar-sidebar-right">
        {/* Conecta el botón "Crear" para que cambie el estado a true */}
        <button className="btn-crear" onClick={() => setModalAbierto(true)}>
          <Plus size={20} /> Crear
        </button>
        
        {/* ── AQUÍ SE INSERTA EL COMPONENTE SEPARADO ── */}
        <MiniCalendario 
          fechaSeleccionada={fechaActual} 
          onFechaCambiada={(nuevaFecha) => setFechaActual(nuevaFecha)} 
        />

        {/* ── 4. UI: TARJETA DE MIS LABORATORIOS ── */}
        <div className="mis-laboratorios-card">
          
          {/* Cabecera (Ahora es un botón interactivo) */}
          <div 
            className="card-header" 
            onClick={() => setMenuDesplegado(!menuDesplegado)}
            style={{ cursor: 'pointer', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={18} /> Mis laboratorios
            </div>
            {/* Cambiamos la flechita dependiendo de si está abierto o cerrado */}
            {menuDesplegado ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {/* Cuerpo (Solo se muestra si menuDesplegado es true) */}
          {menuDesplegado && (
            <div className="card-body">
              {LABORATORIOS_DISPONIBLES.map((lab) => (
                <label key={lab} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={labsActivos.includes(lab)} // Se marca solo si está en nuestro estado
                    onChange={() => toggleLaboratorio(lab)} // Llama a nuestra función al hacer clic
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
  );
};