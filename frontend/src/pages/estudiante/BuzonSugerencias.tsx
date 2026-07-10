import React, { useState, useEffect } from "react";
import "../../css/buzonSugerencias.css";
import { customToast } from "../../components/custom-toast/CustomToast";

interface Sugerencia {
  id: number;
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
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [laboratorioId, setLaboratorioId] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSugerencias();
    fetchLaboratorios();
  }, []);

  const fetchSugerencias = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/sugerencias');
      const data = await res.json();
      if (data.status === 'success') {
        setSugerencias(data.data);
      }
    } catch (error) {
      console.error("Error cargando sugerencias", error);
    }
  };

  const fetchLaboratorios = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/laboratorios');
      const data = await res.json();
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
      usuario_id: 2, // Hardcoded para la demostración (Estudiante)
      laboratorio_id: laboratorioId ? parseInt(laboratorioId) : null,
      titulo,
      comentario: comentarioFinal
    };

    try {
      const res = await fetch('http://localhost:4000/api/sugerencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            sugerencias.map((sug) => {
              // Extraer categoría del comentario (si existe) para mostrarla más limpia
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

              return (
                <div className="sugerencia-card" key={sug.id}>
                  <div className={`estado ${estadoClase}`}>
                    {estadoTexto}
                  </div>

                  <h4>{sug.titulo}</h4>

                  <p>{comentarioLimpio}</p>

                  {sug.respuesta_coordinador && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px', borderLeft: '3px solid #219653' }}>
                      <strong>Respuesta oficial:</strong>
                      <p style={{ margin: '5px 0 0 0', color: '#333' }}>{sug.respuesta_coordinador}</p>
                    </div>
                  )}

                  <span className="fecha">
                    {formatearFecha(sug.fecha_envio)}
                  </span>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};