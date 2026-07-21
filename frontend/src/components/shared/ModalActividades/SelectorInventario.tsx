import { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';

// Reutilizamos las interfaces que tenías
export interface ItemInventarioDB {
    id: number;
    nombre: string;
    cantidad_actual: number;
    cantidad_reservada: number;
    stock_disponible: number;
}

export interface EquipoSeleccionado {
    id: number | string;
    nombre: string;
    disponibles: number;
    cantidad?: number;
}

interface SelectorInventarioProps {
    inventario: ItemInventarioDB[];
    equiposSeleccionados: EquipoSeleccionado[];
    tieneLaboratorio: boolean;
    onAgregar: (equipo: Omit<EquipoSeleccionado, 'cantidad'>) => void;
    onQuitar: (id: string | number) => void;
    onAumentar: (id: string | number) => void;
    onDisminuir: (id: string | number) => void;
}

// Nos trajimos las funciones de los colores de los badges para acá
function badgeClass(disponibles: number) {
    if (disponibles === 0) return "inv-badge-no";
    if (disponibles <= 2) return "inv-badge-lim";
    return "inv-badge-ok";
}

function badgeLabel(disponibles: number) {
    if (disponibles === 0) return "No disponible";
    if (disponibles <= 2) return `Stock bajo (${disponibles})`;
    return `Disponible (${disponibles})`;
}

export function SelectorInventario({
    inventario,
    equiposSeleccionados,
    tieneLaboratorio,
    onAgregar,
    onQuitar,
    onAumentar,
    onDisminuir,
}: SelectorInventarioProps) {
    const [query, setQuery] = useState("");
    const [showResults, setShowResults] = useState(false);

    const resultados = !tieneLaboratorio ? [] : inventario
        .filter(
            (e) =>
                (query.trim() === "" || e.nombre.toLowerCase().includes(query.toLowerCase())) &&
                !equiposSeleccionados.find((s) => s.id === e.id)
        )
        .map((e) => ({
            id: e.id,
            nombre: e.nombre,
            disponibles: e.stock_disponible,
        }));

    const handleAgregar = (equipo: { id: number; nombre: string; disponibles: number }) => {
        onAgregar(equipo);
        setQuery(""); // Limpiamos el buscador localmente
        setShowResults(false);
    };

    return (
        <div className="na-fields">
            <div className="na-field-group">
                <div className="inv-search-wrapper">
                    <Search size={14} className="inv-search-icon" />
                    <input
                        className="na-input inv-search-input"
                        type="text"
                        placeholder="Buscar equipo o activo..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        onBlur={() => setTimeout(() => setShowResults(false), 150)}
                    />

                    {showResults && resultados.length > 0 && (
                        <ul className="inv-results">
                            {resultados.map((equipo) => (
                                <li
                                    key={equipo.id}
                                    className="inv-result-item"
                                    onMouseDown={() => handleAgregar(equipo)}
                                >
                                    <span className="inv-result-nombre">{equipo.nombre}</span>
                                    <span className={`inv-result-badge ${badgeClass(equipo.disponibles)}`}>
                                        {badgeLabel(equipo.disponibles)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {equiposSeleccionados.length > 0 && (
                    <ul className="inv-selected-list">
                        {equiposSeleccionados.map((equipo) => (
                            <li key={equipo.id} className="inv-selected-item">
                                <div className="inv-selected-info">
                                    <span className="inv-selected-nombre">{equipo.nombre}</span>
                                    <span className={`inv-result-badge ${badgeClass(equipo.disponibles)}`}>
                                        {badgeLabel(equipo.disponibles)}
                                    </span>
                                </div>
                                <div className="inv-selected-actions">
                                    <div className="inv-cantidad-wrapper">
                                        <span className="inv-cantidad-label">Cantidad</span>
                                        <div className="inv-cantidad">
                                            <button type="button" onClick={() => onDisminuir(equipo.id)} disabled={(equipo.cantidad || 1) <= 1}>−</button>
                                            <span>{equipo.cantidad || 1}</span>
                                            <button type="button" onClick={() => onAumentar(equipo.id)} disabled={(equipo.cantidad || 1) >= equipo.disponibles}>+</button>
                                        </div>
                                    </div>
                                    <button type="button" className="inv-quitar-btn" onClick={() => onQuitar(equipo.id)}>
                                        <X size={14} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <button type="button" className="inv-add-btn" onClick={() => setShowResults(true)}>
                    <Plus size={13} />
                    Añadir ítem
                </button>
            </div>
        </div>
    );
}