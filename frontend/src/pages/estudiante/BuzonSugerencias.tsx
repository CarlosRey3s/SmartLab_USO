import React, { useState, useEffect } from "react";
import "../../css/buzonSugerencias.css";
import { customToast } from "../../components/custom-toast/CustomToast";
import { useAuth } from "../../context/AuthContext";
import { laboratoriosService } from "../../services/laboratorios.service";
import { BASE_URL } from "../../config/api";

interface Sugerencia {
  id: number;
  usuario_id: number;
  titulo: string;
  comentario: string;
  estado_gestion: string;
  respuesta_coordinador: string;
  fecha_envio: string;
}

interface Laboratorio {
  id: number;
  nombre: string;
}

export const BuzonSugerencias: React.FC = () => {
  const { user } = useAuth();
  
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [laboratorioId, setLaboratorioId] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [sugerenciaExpandida, setSugerenciaExpandida] = useState<number | null>(null);

  useEffect(() => {
    fetchSugerencias();
    fetchLaboratorios();
  }, []);

  const fetchSugerencias = async () => {
    try {
      const token = localStorage.getItem('uso_token');
      const res = await fetch(`${BASE_URL}/api/sugerencias`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        // El backend ya filtra por usuario si es estudiante/docente
        setSugerencias(data.data);
      }
    } catch (error) {
      console.error("Error cargando sugerencias", error);
    }
  };

  const fetchLaboratorios = async () => {
    try {
      const data = await laboratoriosService.getLaboratorios();
      if (data.status === 'success') {
        setLaboratorios(data.data);
      }
    } catch (error) {
      console.error("Error cargando laboratorios", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo || !categoria || !descripcion) {
      customToast.error("Complete todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    
    // Concatenamos la categoría a la descripción ya que la BD no tiene campo categoría
    const comentarioFinal = `[Categoría: ${categoria}]\n${descripcion}`;

    const payload = {
      usuario_id: user?.id ? parseInt(user.id) : 2, // Se envía el id del usuario logueado
      laboratorio_id: laboratorioId ? parseInt(laboratorioId) : null,
      titulo,
      comentario: comentarioFinal
    };

    try {
      const token = localStorage.getItem('uso_token');
      const res = await fetch(`${BASE_URL}/api/sugerencias`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.status === 'success') {
        customToast.success("Sugerencia enviada correctamente.");
        setTitulo("");
        setCategoria("");
        setLaboratorioId("");
        setDescripcion("");
        fetchSugerencias(); // Recargar historial
      } else {
        customToast.error("Error al enviar sugerencia.");
      }
    } catch (error) {
      console.error(error);
      customToast.error("Error de conexión al servidor.");
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    const f = new Date(fecha);
    return f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="buzon-container">

      <div className="buzon-header">
        <h2>Buzón de Sugerencias</h2>
        <p>
          Comparte ideas, mejoras o reporta inconvenientes relacionados con
          laboratorios, reservas o equipos.
        </p>
      </div>

      <div className="buzon-content">

        {/* FORMULARIO */}
        <div className="buzon-form-card">
          <h3>Nueva Sugerencia</h3>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                placeholder="Ej. Mostrar estaciones disponibles"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Categoría *</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="">Seleccione</option>
                <option>Reservas</option>
                <option>Laboratorios</option>
                <option>Inventario</option>
                <option>Equipos</option>
                <option>Calendario</option>
                <option>Reportes</option>
                <option>Sistema</option>
              </select>
            </div>

            <div className="form-group">
              <label>Laboratorio (Opcional)</label>
              <select
                value={laboratorioId}
                onChange={(e) => setLaboratorioId(e.target.value)}
              >
                <option value="">Ninguno en específico</option>
                {laboratorios.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descripción *</label>
              <textarea
                rows={6}
                placeholder="Describe tu sugerencia..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-enviar" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar sugerencia'}
            </button>

          </form>
        </div>

        {/* HISTORIAL */}
        <div className="buzon-historial">
          <h3>Mis sugerencias</h3>

          {sugerencias.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic', marginTop: '10px' }}>No has enviado ninguna sugerencia aún.</p>
          ) : (
            <>
              {(mostrarTodas ? sugerencias : sugerencias.slice(0, 2)).map((sug) => {
                const match = sug.comentario.match(/\[Categoría:\s(.*?)\]\n([\s\S]*)/);
                const comentarioLimpio = match ? match[2] : sug.comentario;
                
                let estadoClase = '';
                let estadoTexto = '';
                
                switch(sug.estado_gestion) {
                  case 'pendiente': estadoClase = 'pendiente'; estadoTexto = 'En revisión'; break;
                  case 'en_revisión': estadoClase = 'pendiente'; estadoTexto = 'En revisión'; break;
                  case 'atendida': estadoClase = 'respondida'; estadoTexto = 'Respondida'; break;
                  case 'archivada': estadoClase = 'archivada'; estadoTexto = 'Archivada'; break;
                  default: estadoClase = 'pendiente'; estadoTexto = 'Pendiente';
                }

                const isExpanded = sugerenciaExpandida === sug.id;

                return (
                  <div 
                    className="sugerencia-card" 
                    key={sug.id}
                    onClick={() => setSugerenciaExpandida(isExpanded ? null : sug.id)}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div className={`estado ${estadoClase}`}>
                        {estadoTexto}
                      </div>
                      <span className="fecha" style={{ fontSize: '0.8rem', color: '#888' }}>
                        {formatearFecha(sug.fecha_envio)}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 10px 0', display: 'flex', justifyContent: 'space-between' }}>
                      {sug.titulo}
                      <span style={{ color: '#005b4f', fontSize: '1.2rem' }}>
                        {isExpanded ? '−' : '+'}
                      </span>
                    </h4>

                    {isExpanded && (
                      <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                        <p style={{ color: '#555', lineHeight: '1.5' }}>{comentarioLimpio}</p>

                        {sug.respuesta_coordinador && (
                          <div style={{ marginTop: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '5px', borderLeft: '3px solid #219653' }}>
                            <strong style={{ display: 'block', marginBottom: '5px', color: '#333' }}>Respuesta oficial:</strong>
                            <p style={{ margin: '0', color: '#444' }}>{sug.respuesta_coordinador}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {sugerencias.length > 2 && (
                <button 
                  onClick={() => setMostrarTodas(!mostrarTodas)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginTop: '15px',
                    background: 'none',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    color: '#555',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {mostrarTodas ? 'Ver menos' : `Ver más (${sugerencias.length - 2} restantes)`}
                </button>
              )}
            </>
          )}
        </div>

      </div>

    </div>
  );
};