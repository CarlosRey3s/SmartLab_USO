import "../../css/reservas.css";
import { useState, useEffect } from "react";
import { type Laboratorio } from "../../types/laboratorio.types";
import { laboratoriosService } from "../../services/laboratorios.service";

interface Reserva {
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
}

export default function Reservar() {

  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarLaboratorios = async () => {
      const response = await laboratoriosService.getLaboratorios();
      if (response.success) {
        setLaboratorios(response.data);
      }
      setLoading(false);
    };

    cargarLaboratorios();
  }, []);

  const [reservas] = useState<Reserva[]>([
    {
      titulo: "Proyecto de Electrónica",
      fecha: "03 Agosto 2026",
      hora: "1:00 PM - 2:00 PM",
      lugar: "L1"
    },
    {
      titulo: "Robótica",
      fecha: "05 Agosto 2026",
      hora: "3:00 PM - 5:00 PM",
      lugar: "L2"
    },
    {
      titulo: "Sistemas Digitales",
      fecha: "08 Agosto 2026",
      hora: "10:00 AM - 12:00 PM",
      lugar: "L3"
    }
  ]);

  const agregarItem = () => {
    setItems([...items, ""]);
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarItem = (index: number, value: string) => {
    const nuevos = [...items];
    nuevos[index] = value;
    setItems(nuevos);
  };

  return (
    <div className="main">

      <div className="labs">
        <h2>Laboratorios</h2>

        {loading ? (
          <p>Cargando laboratorios...</p>
        ) : (
          laboratorios.map((lab) => (
            <div key={lab.id} className="lab-card" onClick={() => setShowModal(true)}>
              <h3>{lab.nombre}</h3>
              <div className="lab-info">
                <p>{lab.descripcion}</p>
                <span className="disponibilidad">Estado: {lab.estado}</span>
              </div>
            </div>
          ))
        )}

        {!loading && laboratorios.length === 0 && (
          <p>No hay laboratorios disponibles en este momento.</p>
        )}
      </div>

      {/* PANEL TIPO LISTA (SIN BURBUJAS) */}
      <div className="reservas-panel" style={{ flex: 1 }}>
        <h3 className="titulo-reservas">Mis reservaciones</h3>

        {reservas.map((reserva, index) => (
          <div key={index} className="reserva-card">
            <h4>{reserva.titulo}</h4>
            <p>- {reserva.hora}</p>
            <p className="fecha">Vence: {reserva.fecha}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">

            <h2>Nueva Reserva</h2>

            <div className="form-grid">
              <div>
                <label>Título</label>
                <input type="text" />
              </div>

              <div>
                <label>Mesa</label>
                <select>
                  <option>Mesa 1</option>
                </select>
              </div>

              <div>
                <label>Laboratorio</label>
                <select>
                  <option value="">Seleccione un laboratorio</option>
                  {laboratorios.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Fecha</label>
                <input type="date" />
              </div>

              <div>
                <label>Desde</label>
                <input type="time" />
              </div>

              <div>
                <label>Hasta</label>
                <input type="time" />
              </div>

              <div>
                <label>Personas (1 - 5)</label>
                <input type="number" min={1} max={5} defaultValue={1} />
              </div>
            </div>

            <div style={{ marginTop: "15px" }}>
              <label>Herramientas (opcional)</label>

              {items.map((item, index) => (
                <div key={index} style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => actualizarItem(index, e.target.value)}
                  />
                  <button onClick={() => eliminarItem(index)}>X</button>
                </div>
              ))}

              <button onClick={agregarItem}>+ Añadir ítem</button>
            </div>

            <textarea placeholder="Notas adicionales..." />

            <div className="modal-buttons">
              <button onClick={() => setShowModal(false)}>Guardar</button>
              <button onClick={() => setShowModal(false)}>Cancelar</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
