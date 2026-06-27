import React, { useState } from "react";
import "../../css/buzonSugerencias.css";

export const BuzonSugerencias: React.FC = () => {
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo || !categoria || !descripcion) {
      alert("Complete todos los campos obligatorios.");
      return;
    }

    alert("Sugerencia enviada correctamente.");

    setTitulo("");
    setCategoria("");
    setLaboratorio("");
    setDescripcion("");
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
              <input
                type="text"
                placeholder="Ej. Laboratorio de Electrónica"
                value={laboratorio}
                onChange={(e) => setLaboratorio(e.target.value)}
              />
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

            <button type="submit" className="btn-enviar">
              Enviar sugerencia
            </button>

          </form>
        </div>

        {/* HISTORIAL */}
        <div className="buzon-historial">

          <h3>Mis sugerencias</h3>

          <div className="sugerencia-card">
            <div className="estado pendiente">
              En revisión
            </div>

            <h4>Mostrar estaciones disponibles</h4>

            <p>
              Sería útil visualizar las mesas libres antes de realizar
              una reserva.
            </p>

            <span className="fecha">
              20 Jun 2026
            </span>
          </div>

          <div className="sugerencia-card">
            <div className="estado respondida">
              Respondida
            </div>

            <h4>Agregar filtros de laboratorio</h4>

            <p>
              Se revisará para una futura actualización del sistema.
            </p>

            <span className="fecha">
              15 Jun 2026
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};