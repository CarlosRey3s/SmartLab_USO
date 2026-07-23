import Select from 'react-select';

interface FormularioMantenimientoProps {
    descripcion?: string;
    onChange: (field: string, value: any) => void;
}

export function FormularioMantenimiento({
    descripcion,
    onChange,
}: FormularioMantenimientoProps) {
    return (
        <div className="na-fields">
            <div className="na-field-group">
                <label className="na-field-label">DESCRIPCIÓN DEL TRABAJO</label>
                <textarea
                    className="na-textarea"
                    placeholder="Ej: Revisión general de equipos, cambio de fuente de poder #3..."
                    value={descripcion || ""}
                    onChange={(e) => onChange("descripcion", e.target.value)}
                />
            </div>
        </div>
    );
}