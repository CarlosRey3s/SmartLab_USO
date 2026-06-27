import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addDays 
} from 'date-fns';
import { es } from 'date-fns/locale/es';

// Exportamos la interfaz por si necesitas usarla en otro lado
export interface MiniCalendarioProps {
  fechaSeleccionada: Date;
  onFechaCambiada: (nuevaFecha: Date) => void;
}

export const MiniCalendario = ({ fechaSeleccionada, onFechaCambiada }: MiniCalendarioProps) => {
  const [mesVisualizado, setMesVisualizado] = useState(fechaSeleccionada);

  useEffect(() => {
    setMesVisualizado(fechaSeleccionada);
  }, [fechaSeleccionada]);

  const mesAnterior = () => setMesVisualizado(subMonths(mesVisualizado, 1));
  const mesSiguiente = () => setMesVisualizado(addMonths(mesVisualizado, 1));

  const mesTextoFormateado = format(mesVisualizado, 'MMMM yyyy', { locale: es });
  const tituloMes = mesTextoFormateado.charAt(0).toUpperCase() + mesTextoFormateado.slice(1);

  const inicioMes = startOfMonth(mesVisualizado);
  const finMes = endOfMonth(inicioMes);
  const fechaInicioGrid = startOfWeek(inicioMes, { weekStartsOn: 0 });
  const fechaFinGrid = endOfWeek(finMes, { weekStartsOn: 0 });

  const diasDelGrid = [];
  let diaIterador = fechaInicioGrid;
  while (diaIterador <= fechaFinGrid) {
    diasDelGrid.push(diaIterador);
    diaIterador = addDays(diaIterador, 1);
  }

  const diasSemana = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <div className="mini-calendario-container">
      <div className="mini-calendario-header">
        <span className="mini-calendario-title">{tituloMes}</span>
        <div className="mini-calendario-nav">
          <button onClick={mesAnterior} className="btn-icon-mini"><ChevronLeft size={16} /></button>
          <button onClick={mesSiguiente} className="btn-icon-mini"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="mini-calendario-dias-semana">
        {diasSemana.map((dia, idx) => (
          <div key={idx} className="dia-semana-letra">{dia}</div>
        ))}
      </div>

      <div className="mini-calendario-grid">
        {diasDelGrid.map((dia, index) => {
          const esMesActual = isSameMonth(dia, mesVisualizado);
          const esElDiaSeleccionado = isSameDay(dia, fechaSeleccionada);
          const esElDiaDeHoy = isToday(dia);

          let clasesDia = "mini-dia-btn ";
          if (!esMesActual) clasesDia += "dia-fuera-mes ";
          if (esElDiaSeleccionado) clasesDia += "dia-seleccionado ";
          else if (esElDiaDeHoy) clasesDia += "dia-hoy ";

          return (
            <button
              key={index}
              onClick={() => onFechaCambiada(dia)}
              className={clasesDia}
            >
              <span className="numero-dia">{format(dia, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};