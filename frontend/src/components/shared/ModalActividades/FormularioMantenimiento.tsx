import Select from 'react-select';

interface FormularioMantenimientoProps {
    responsable?: string | number;
    descripcion?: string;
    tecnicosOptions: { value: number; label: string }[];
    onChange: (field: string, value: any) => void;
}

export function FormularioMantenimiento({
    responsable,
    descripcion,
    tecnicosOptions,
    onChange,
}: FormularioMantenimientoProps) {
    return (
        <div className="na-fields">
            <div className="na-field-group">
                <label className="na-field-label">RESPONSABLE TÉCNICO</label>
                <Select
                    placeholder="Buscar técnico..."
                    options={tecnicosOptions}
                    value={tecnicosOptions.find((opt) => opt.value === responsable) || null}
                    onChange={(selected: any) => onChange("responsable", selected ? selected.value : "")}
                    noOptionsMessage={() => "No se encontraron técnicos"}
                    styles={{
                        control: (base, state) => ({
                            ...base,
                            backgroundColor: '#f8fafc',
                            borderColor: state.isFocused ? '#1a3a34' : '#e2e8f0',
                            borderWidth: '1.5px',
                            borderRadius: '8px',
                            boxShadow: 'none',
                            minHeight: '38px',
                            fontSize: '13px',
                            '&:hover': {
                                borderColor: state.isFocused ? '#1a3a34' : '#cbd5e1'
                            }
                        }),
                        menu: (base) => ({
                            ...base,
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            zIndex: 9999,
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }),
                        option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? '#e2e8f0' : state.isFocused ? '#f1f5f9' : '#ffffff',
                            color: '#1a1a1a',
                            cursor: 'pointer',
                            '&:active': {
                                backgroundColor: '#cbd5e1'
                            }
                        }),
                        singleValue: (base) => ({
                            ...base,
                            color: '#1a1a1a'
                        }),
                        input: (base) => ({
                            ...base,
                            color: '#1a1a1a'
                        }),
                        placeholder: (base) => ({
                            ...base,
                            color: '#aaa'
                        })
                    }}
                />
            </div>
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