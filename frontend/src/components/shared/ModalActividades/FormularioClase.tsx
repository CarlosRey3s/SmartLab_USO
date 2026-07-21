import Select from 'react-select';

interface FormularioClaseProps {
    materia?: string;
    docente?: string | number;
    numPersonas?: number;
    docentesOptions: { value: number; label: string }[];
    onChange: (field: string, value: any) => void;
}

export function FormularioClase({ materia, docente, numPersonas, docentesOptions, onChange, }: FormularioClaseProps) {
    return (
        <div className="na-fields">
            <div className="na-row2">
                <div className="na-field-group">
                    <label className="na-field-label">MATERIA / TÍTULO</label>
                    <input
                        className="na-input"
                        placeholder="Ej: Física I, Electrónica Digital..."
                        value={materia || ""}
                        onChange={(e) => onChange("materia", e.target.value)}
                    />
                </div>
                <div className="na-field-group">
                    <label className="na-field-label">DOCENTE</label>
                    <Select
                        placeholder="Buscar docente..."
                        options={docentesOptions}
                        value={docentesOptions.find((opt) => opt.value === docente) || null}
                        onChange={(selected: any) => onChange("docente", selected ? selected.value : "")}
                        noOptionsMessage={() => "No se encontraron docentes"}
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
            </div>
            <div className="na-field-group">
                <label className="na-field-label">N° DE ESTUDIANTES</label>
                <div className="na-num-row">
                    <button
                        className="na-num-btn"
                        onClick={() => onChange("numPersonas", Math.max(1, (numPersonas || 1) - 1))}
                    >
                        −
                    </button>
                    <span className="na-num-val">{numPersonas}</span>
                    <button
                        className="na-num-btn"
                        onClick={() => onChange("numPersonas", (numPersonas || 0) + 1)}
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}