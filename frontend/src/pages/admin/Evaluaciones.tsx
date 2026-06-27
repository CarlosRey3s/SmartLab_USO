import React, { useState } from 'react';
import { Plus, Trash2, Save, Eye, ClipboardList, HelpCircle, Search, Filter, ArrowLeft, MoreVertical, Edit2 } from 'lucide-react';
import '../../css/admin-evaluaciones.css';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface PastEvaluation {
  id: string;
  title: string;
  laboratory: string;
  date: string;
  questionsCount: number;
  status: 'Publicada' | 'Borrador';
}

export const EvaluacionesAdminView = () => {
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });

  const [generalInfo, setGeneralInfo] = useState({
    title: '',
    laboratory: '',
    date: '',
    duration: '60'
  });

  // Datos de ejemplo para evaluaciones ya hechas
  const [pastEvaluations, setPastEvaluations] = useState<PastEvaluation[]>([
    {
      id: '1',
      title: 'Parcial de Electrónica I',
      laboratory: 'Laboratorio de Electrónica',
      date: '2024-04-15',
      questionsCount: 15,
      status: 'Publicada'
    },
    {
      id: '2',
      title: 'Quiz: Redes de Datos',
      laboratory: 'Laboratorio de Redes',
      date: '2024-04-18',
      questionsCount: 10,
      status: 'Publicada'
    },
    {
      id: '3',
      title: 'Práctica 4: Circuitos',
      laboratory: 'Laboratorio de Cómputo',
      date: '2024-04-20',
      questionsCount: 8,
      status: 'Borrador'
    }
  ]);

  const handleDeleteEvaluation = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta evaluación?')) {
      setPastEvaluations(pastEvaluations.filter(e => e.id !== id));
      setActiveMenu(null);
    }
  };

  const handleEditEvaluation = (evalItem: PastEvaluation) => {
    // Simulación de carga de datos para editar
    setGeneralInfo({
      title: evalItem.title,
      laboratory: evalItem.laboratory,
      date: evalItem.date,
      duration: '60'
    });
    setViewMode('create');
    setActiveMenu(null);
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.text || currentQuestion.options.some(opt => !opt)) {
      alert('Por favor, completa la pregunta y todas las opciones.');
      return;
    }

    const newQuestion: Question = {
      id: Date.now(),
      text: currentQuestion.text,
      options: [...currentQuestion.options],
      correctAnswer: currentQuestion.correctAnswer
    };

    setQuestions([...questions, newQuestion]);
    
    // Limpiar formulario de pregunta
    setCurrentQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
  };

  const handleRemoveQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const filteredEvaluations = pastEvaluations.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.laboratory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- VISTA DE LISTA (TIPO INVENTARIO) ---
  if (viewMode === 'list') {
    return (
      <div className="admin-eval-container">
        <div className="admin-eval-header-inventory">
          <div className="title-section">
            <h2 className="admin-eval-title">Gestión de Evaluaciones</h2>
            <p className="admin-eval-subtitle">Administra y supervisa los cuestionarios del sistema.</p>
          </div>
          <button className="btn-add-eval" onClick={() => setViewMode('create')}>
            <Plus size={20} />
            <span>Añadir Evaluación</span>
          </button>
        </div>

        <div className="admin-eval-controls">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por título o laboratorio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-filter">
            <Filter size={18} />
            Filtrar
          </button>
        </div>

        <div className="admin-eval-table-wrapper">
          <table className="inventory-style-table">
            <thead>
              <tr>
                <th>Evaluación</th>
                <th>Laboratorio</th>
                <th>Fecha Modificación</th>
                <th>Preguntas</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.map((evalItem) => (
                <tr key={evalItem.id}>
                  <td>
                    <div className="eval-cell">
                      <div className="eval-icon">
                        <ClipboardList size={20} />
                      </div>
                      <div className="eval-info">
                        <span className="eval-name">{evalItem.title}</span>
                      </div>
                    </div>
                  </td>
                  <td>{evalItem.laboratory}</td>
                  <td>{evalItem.date}</td>
                  <td style={{ textAlign: 'center' }}>{evalItem.questionsCount}</td>
                  <td>
                    <span className={`status-pill ${evalItem.status.toLowerCase()}`}>
                      {evalItem.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-menu-container">
                      <button 
                        className="action-dot-btn"
                        onClick={() => setActiveMenu(activeMenu === evalItem.id ? null : evalItem.id)}
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {activeMenu === evalItem.id && (
                        <div className="actions-dropdown">
                          <button className="dropdown-item" onClick={() => handleEditEvaluation(evalItem)}>
                            <Edit2 size={16} />
                            Editar
                          </button>
                          <button className="dropdown-item delete" onClick={() => handleDeleteEvaluation(evalItem.id)}>
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- VISTA DE CREACIÓN (CONSTRUCTOR) ---
  return (
    <div className="admin-eval-container">
      <div className="admin-eval-header-create">
        <button className="btn-back" onClick={() => setViewMode('list')}>
          <ArrowLeft size={18} />
          Volver a la lista
        </button>
        <div style={{ marginTop: '16px' }}>
          <h2 className="admin-eval-title">Nueva Evaluación</h2>
          <p className="admin-eval-subtitle">Diseña los detalles y preguntas para los estudiantes.</p>
        </div>
      </div>

      <div className="admin-eval-grid">
        {/* PANEL IZQUIERDO: CONSTRUCTOR */}
        <div className="eval-left-panel">
          <section className="eval-card" style={{ marginBottom: '24px' }}>
            <h3><ClipboardList size={20} /> Datos Generales</h3>
            <div className="form-grid-eval">
              <div className="form-group">
                <label>Título de la Evaluación</label>
                <input 
                  type="text" 
                  placeholder="Ej. Parcial de Electrónica I" 
                  value={generalInfo.title}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Laboratorio</label>
                <select 
                  value={generalInfo.laboratory}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, laboratory: e.target.value })}
                >
                  <option value="">Seleccione Laboratorio</option>
                  <option value="Laboratorio de Redes">Laboratorio de Redes</option>
                  <option value="Laboratorio de Cómputo">Laboratorio de Cómputo</option>
                  <option value="Laboratorio de Electrónica">Laboratorio de Electrónica</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fecha Límite</label>
                <input 
                  type="date" 
                  value={generalInfo.date}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Duración (Minutos)</label>
                <input 
                  type="number" 
                  value={generalInfo.duration}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, duration: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="eval-card">
            <h3><HelpCircle size={20} /> Constructor de Preguntas</h3>
            <div className="question-builder-form">
              <div className="form-group">
                <label>Enunciado de la Pregunta</label>
                <textarea 
                  rows={3} 
                  placeholder="Escribe la pregunta aquí..."
                  value={currentQuestion.text}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                ></textarea>
              </div>

              <div className="options-grid-eval">
                <label style={{ fontSize: '14px', fontWeight: 'bold', gridColumn: 'span 2' }}>Opciones de Respuesta</label>
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className={`option-input-group ${currentQuestion.correctAnswer === index ? 'correct' : ''}`}>
                    <span className="option-label">{String.fromCharCode(65 + index)}</span>
                    <input 
                      type="text" 
                      placeholder={`Opción ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    <div 
                      className="correct-checker"
                      onClick={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                    >
                      <input 
                        type="radio" 
                        name="correct-ans" 
                        checked={currentQuestion.correctAnswer === index}
                        readOnly
                      />
                      Correcta
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-primary-eval" onClick={handleAddQuestion}>
                <Plus size={20} /> Añadir Pregunta
              </button>
            </div>
          </section>
        </div>

        {/* PANEL DERECHO: RESUMEN */}
        <div className="eval-right-panel">
          <section className="eval-card" style={{ position: 'sticky', top: '20px' }}>
            <h3 style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
               Resumen ({questions.length})
            </h3>
            
            <div className="questions-list-eval" style={{ marginTop: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              {questions.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontStyle: 'italic' }}>
                  No hay preguntas añadidas aún.
                </p>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className="question-item-mini">
                    <p><strong>{idx + 1}.</strong> {q.text}</p>
                    <button className="btn-delete-q" onClick={() => handleRemoveQuestion(q.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn-primary-eval" 
                style={{ width: '100%', background: 'linear-gradient(to right, var(--verde), var(--verde-oscuro))' }}
                disabled={questions.length === 0}
                onClick={() => {
                  alert('¡Evaluación publicada con éxito!');
                  setViewMode('list');
                }}
              >
                <Save size={18} /> Publicar Evaluación
              </button>
              <button className="btn-secondary-eval" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Eye size={18} /> Vista Previa
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
