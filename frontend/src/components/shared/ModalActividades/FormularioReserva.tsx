interface FormularioReservaProps {
    titulo?: string;
    onChange: (field: string, value: any) => void;
}

export function FormularioReserva({ titulo, onChange }: FormularioReservaProps) {
    return (
        <div className="na-fields">
            <div className="na-field-group">
                <label className="na-field-label">TÍTULO / MOTIVO</label>
                <input
                    className="na-input"
                    placeholder="Ej: Demostración para visita académica, Práctica docente..."
                    value={titulo || ""}
                    onChange={(e) => onChange("titulo", e.target.value)}
                />
            </div>
        </div>
    );
}