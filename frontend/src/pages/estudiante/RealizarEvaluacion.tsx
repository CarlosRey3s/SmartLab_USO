import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/realizarEvaluacion.css';

interface Pregunta {
  id: number;
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

const preguntas: Pregunta[] = [
  {
    id: 1,
    texto: "¿Cuál es el protocolo de seguridad principal en este laboratorio?",
    opciones: [
      "Uso obligatorio de lentes de seguridad y bata",
      "Se puede entrar con alimentos",
      "No es necesario el uso de calzado cerrado",
      "El equipo se puede manipular sin supervisión"
    ],
    respuestaCorrecta: 0
  },
  {
    id: 2,
    texto: "¿Qué herramienta se debe usar para medir voltaje continuo?",
    opciones: [
      "Osciloscopio únicamente",
      "Multímetro en escala de DC",
      "Generador de funciones",
      "Fuente de poder"
    ],
    respuestaCorrecta: 1
  },
  {
    id: 3,
    texto: "¿Cuál es la capacidad máxima permitida en la estación A?",
    opciones: [
      "5 personas",
      "2 personas",
      "10 personas",
      "No hay límite"
    ],
    respuestaCorrecta: 1
  },
  {
    id: 4,
    texto: "¿Qué acción realizar en caso de cortocircuito detectado?",
    opciones: [
      "Intentar arreglarlo con las manos",
      "Gritar y salir corriendo",
      "Desconectar la fuente de alimentación inmediatamente",
      "Ignorarlo si no sale humo"
    ],
    respuestaCorrecta: 2
  },
  {
    id: 5,
    texto: "¿Dónde se encuentra el extintor más cercano?",
    opciones: [
      "En el baño",
      "A la entrada del laboratorio de electrónica",
      "No hay extintores",
      "En la oficina del decano"
    ],
    respuestaCorrecta: 1
  }
];

const RealizarEvaluacion: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number | null>(null);
  const [finalizado, setFinalizado] = useState(false);

  const handleNext = () => {
    if (respuestaSeleccionada === null) return;

    if (currentStep < preguntas.length - 1) {
      setCurrentStep(prev => prev + 1);
      setRespuestaSeleccionada(null);
    } else {
      setFinalizado(true);
    }
  };

  const currentPregunta = preguntas[currentStep];
  const progress = ((currentStep + 1) / preguntas.length) * 100;

  if (finalizado) {
    return (
      <div className="evaluacion-container">
        <div className="evaluacion-card final-card fade-in">
          <div className="final-icon">✅</div>
          <h2 className="pregunta-titulo">¡Evaluación Completada!</h2>
          <p className="pregunta-texto">Tus respuestas han sido enviadas correctamente para su revisión.</p>
          <div className="footer-buttons" style={{ justifyContent: 'center' }}>
            <button className="btn-continuar" onClick={() => navigate('/evaluaciones')}>
              Volver a Evaluaciones
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluacion-container">
      <div className="evaluacion-card fade-in" key={currentStep} style={{ position: 'relative' }}>
        <button className="btn-salir" onClick={() => navigate('/evaluaciones')} title="Salir">
          ✕
        </button>

        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        
        <p style={{ textAlign: 'left', color: 'var(--rosado)', fontWeight: 'bold', marginBottom: '10px' }}>
          Pregunta {currentStep + 1} de {preguntas.length}
        </p>
        
        <h2 className="pregunta-titulo">{currentPregunta.texto}</h2>
        <p className="pregunta-texto">Selecciona la opción correcta:</p>

        <div className="opciones-container">
          {currentPregunta.opciones.map((opcion, index) => (
            <button
              key={index}
              className={`opcion-button ${respuestaSeleccionada === index ? 'selected' : ''}`}
              onClick={() => setRespuestaSeleccionada(index)}
            >
              <span className="letra-indicador">
                {String.fromCharCode(65 + index)}
              </span>
              {opcion}
            </button>
          ))}
        </div>

        <div className="aviso-guardado">
          <span>⚠️</span>
          <span>La información se guardará al finalizar y no podrá ser modificada después.</span>
        </div>

        <div className="footer-buttons">
          <button 
            className="btn-continuar" 
            disabled={respuestaSeleccionada === null}
            onClick={handleNext}
          >
            {currentStep === preguntas.length - 1 ? 'Finalizar' : 'Siguiente'}
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealizarEvaluacion;
