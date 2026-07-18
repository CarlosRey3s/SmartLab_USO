import { useState, useEffect } from 'react';
import { usuariosService } from '../services/usuarios.service';
import { chequearDisponibilidad, obtenerInventarioDisponible } from '../services/actividades.service';

export type TipoActividad = "clase" | "mantenimiento" | "reserva" | null;
export type ModoReserva = "por_estacion" | "espacio_completo";
export type EstadoEstacion = "disponible" | "no_disponible";

export interface LaboratorioDB {
    id: number;
    nombre: string;
    modo_reserva: ModoReserva;
    capacidad_maxima?: number;
}

export interface EstacionDB {
    id: number;
    numero: string;
    nombre?: string;
    estado: EstadoEstacion;
    capacidad?: number;
}

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

export interface FormData {
    tipo: TipoActividad;
    materia?: string;
    docente?: string | number;
    responsable?: string | number;
    descripcion?: string;
    titulo?: string;
    estaciones?: (number | string)[];
    equipos?: EquipoSeleccionado[];
    laboratorio?: string;
    numPersonas?: number;
    fecha?: string;
    desde?: string;
    hasta?: string;
    recurrencia?: string;
}

const STEPS: Record<Exclude<TipoActividad, null>, string[]> = {
    clase: ["datos", "horario", "laboratorio", "instrumentos"],
    mantenimiento: ["datos", "horario", "laboratorio"],
    reserva: ["datos", "horario", "laboratorio", "instrumentos"],
};

interface UseActividadFormProps {
    actividadExistente?: any;
    onGuardar: (data: any) => void;
    onClose: () => void;
}

export function useActividadForm({ actividadExistente, onGuardar, onClose }: UseActividadFormProps) {
    const [labsDesdeBD, setLabsDesdeBD] = useState<LaboratorioDB[]>([]);
    const [cargandoLabs, setCargandoLabs] = useState(true);
    const [estacionesDesdeBD, setEstacionesDesdeBD] = useState<EstacionDB[]>([]);
    const [cargandoEstaciones, setCargandoEstaciones] = useState(false);
    const [inventarioDesdeBD, setInventarioDesdeBD] = useState<ItemInventarioDB[]>([]);
    const [cargandoInventario, setCargandoInventario] = useState(false);

    const [tipo, setTipo] = useState<TipoActividad>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [form, setForm] = useState<FormData>({
        tipo: null,
        numPersonas: 20,
        recurrencia: "No se repite",
        equipos: [],
        estaciones: [],
    });

    const [estacionesOcupadas, setEstacionesOcupadas] = useState<number[]>([]);
    const [bloqueoTotal, setBloqueoTotal] = useState<boolean>(false);
    const [verificando, setVerificando] = useState<boolean>(false);
    const [mostrarSoloDisponibles, setMostrarSoloDisponibles] = useState<boolean>(false);

    const [tecnicosOptions, setTecnicosOptions] = useState<{ value: number, label: string }[]>([]);
    const [docentesOptions, setDocentesOptions] = useState<{ value: number, label: string }[]>([]);

    // ── EFECTOS (Carga de datos y modo edición) ──
    useEffect(() => {
        if (actividadExistente) {
            const start = new Date(actividadExistente.start);
            const end = new Date(actividadExistente.end);

            const fechaLocal = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const desdeLocal = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
            const hastaLocal = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

            setTipo(actividadExistente.tipo);
            setForm({
                tipo: actividadExistente.tipo,
                laboratorio: actividadExistente.laboratorio_id ? actividadExistente.laboratorio_id.toString() : "",
                fecha: fechaLocal,
                desde: desdeLocal,
                hasta: hastaLocal,
                recurrencia: actividadExistente.recurrencia || "No se repite",
                materia: actividadExistente.materia || "",
                docente: actividadExistente.docente_id || "",
                numPersonas: actividadExistente.clase_estudiantes || 20,
                responsable: actividadExistente.tecnico_responsable || "",
                descripcion: actividadExistente.mant_descripcion || actividadExistente.reserva_nota || "",
                titulo: actividadExistente.reserva_titulo || "",
                estaciones: actividadExistente.estaciones ? actividadExistente.estaciones.map((e: any) => Number(e)) : [],
                equipos: []
            });
        }
    }, [actividadExistente]);

    useEffect(() => {
        const fetchlaboratorios = async () => {
            try {
                const response = await fetch('http://localhost:4000/api/laboratorios');
                const result = await response.json();
                if (result.success || result.data) setLabsDesdeBD(result.data || result);
                else if (Array.isArray(result)) setLabsDesdeBD(result);
            } catch (error) {
                console.error('Error al cargar laboratorios:', error);
            } finally {
                setCargandoLabs(false);
            }
        };
        fetchlaboratorios();
    }, []);

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const data = await usuariosService.getUsuarios();
                const usuarios = Array.isArray(data) ? data : data.data || [];

                const tecnicos = usuarios.filter((u: any) => ['técnico', 'tecnico', 'Técnico', 'Tecnico'].includes(u.rol));
                setTecnicosOptions(tecnicos.map((t: any) => ({ value: t.id, label: `${t.nombre} ${t.apellido || ''}`.trim() })));

                const docentes = usuarios.filter((u: any) => ['docente', 'Docente', 'DOCENTE'].includes(u.rol));
                setDocentesOptions(docentes.map((d: any) => ({ value: d.id, label: `${d.nombre} ${d.apellido || ''}`.trim() })));
            } catch (error) {
                console.error('Error al cargar usuarios:', error);
            }
        };
        fetchUsuarios();
    }, []);

    useEffect(() => {
        if (!form.laboratorio) {
            setEstacionesDesdeBD([]);
            return;
        }
        const fetchEstaciones = async () => {
            setCargandoEstaciones(true);
            try {
                const response = await fetch(`http://localhost:4000/api/laboratorios/${form.laboratorio}/estaciones`);
                const result = await response.json();
                if (result.success || result.data) setEstacionesDesdeBD(result.data || result);
                else if (Array.isArray(result)) setEstacionesDesdeBD(result);
            } catch (error) {
                console.error(`Error al cargar estaciones del lab ${form.laboratorio}:`, error);
            } finally {
                setCargandoEstaciones(false);
            }
        };
        fetchEstaciones();
    }, [form.laboratorio]);

    useEffect(() => {
        const fetchInventarioDinámico = async () => {
            if (form.laboratorio && form.fecha && form.desde && form.hasta) {
                setCargandoInventario(true);
                try {
                    const res = await obtenerInventarioDisponible(parseInt(form.laboratorio), form.fecha, form.desde, form.hasta, actividadExistente?.id);
                    if (res.status === 'success') {
                        setInventarioDesdeBD(res.data);
                        // Sincronizar el stock de los equipos ya seleccionados por si cambia la fecha/hora
                        setForm(prev => {
                            if (!prev.equipos || prev.equipos.length === 0) return prev;
                            const nuevosEquipos = prev.equipos.map(eq => {
                                const invItem = res.data.find((item: ItemInventarioDB) => item.id === eq.id);
                                const nuevoDisponibles = invItem ? invItem.stock_disponible : 0;
                                return {
                                    ...eq,
                                    disponibles: nuevoDisponibles,
                                    cantidad: Math.min(eq.cantidad || 1, nuevoDisponibles > 0 ? nuevoDisponibles : 1)
                                };
                            }).filter(eq => eq.disponibles > 0);

                            return { ...prev, equipos: nuevosEquipos };
                        });
                    } else {
                        setInventarioDesdeBD([]);
                    }
                } catch (error) {
                    setInventarioDesdeBD([]);
                } finally {
                    setCargandoInventario(false);
                }
            } else {
                setInventarioDesdeBD([]);
                setForm(prev => ({ ...prev, equipos: [] }));
            }
        };
        const timeoutId = setTimeout(() => fetchInventarioDinámico(), 500);
        return () => clearTimeout(timeoutId);
    }, [form.laboratorio, form.fecha, form.desde, form.hasta, actividadExistente]);

    useEffect(() => {
        const verificar = async () => {
            if (form.laboratorio && form.fecha && form.desde && form.hasta) {
                setVerificando(true);
                try {
                    const result = await chequearDisponibilidad(parseInt(form.laboratorio), form.fecha, form.desde, form.hasta, actividadExistente?.id);
                    if (result) {
                        setBloqueoTotal(result.bloqueoTotal);
                        setEstacionesOcupadas(result.estacionesOcupadas || []);
                        if (result.estacionesOcupadas && result.estacionesOcupadas.length > 0) {
                            setForm(prev => ({
                                ...prev,
                                estaciones: (prev.estaciones || []).filter(id => !result.estacionesOcupadas.includes(typeof id === 'string' ? parseInt(id) : id))
                            }));
                        }
                    }
                } catch (error) {
                    console.error("Error validando disponibilidad", error);
                } finally {
                    setVerificando(false);
                }
            } else {
                setBloqueoTotal(false);
                setEstacionesOcupadas([]);
            }
        };
        const timeoutId = setTimeout(() => verificar(), 500);
        return () => clearTimeout(timeoutId);
    }, [form.laboratorio, form.fecha, form.desde, form.hasta, actividadExistente]);

    // ── FUNCIONES DE AYUDA Y CONTROLADORES ──
    const equiposSeleccionados: EquipoSeleccionado[] = form.equipos || [];
    const estacionesSeleccionadas: (number | string)[] = form.estaciones || [];

    const agregarEquipo = (equipo: EquipoSeleccionado) => {
        setForm(prev => ({ ...prev, equipos: [...(prev.equipos || []), { ...equipo, cantidad: 1 }] }));
    };

    const quitarEquipo = (id: string | number) => {
        setForm(prev => ({ ...prev, equipos: (prev.equipos || []).filter(e => e.id !== id) }));
    };

    const aumentarCantidad = (id: string | number) => {
        setForm(prev => ({
            ...prev,
            equipos: (prev.equipos || []).map(equipo => {
                if (equipo.id !== id) return equipo;
                const cantidadActual = equipo.cantidad ?? 1;
                return { ...equipo, cantidad: cantidadActual < equipo.disponibles ? cantidadActual + 1 : cantidadActual };
            }),
        }));
    };

    const disminuirCantidad = (id: string | number) => {
        setForm(prev => ({
            ...prev,
            equipos: (prev.equipos || []).map(equipo => {
                if (equipo.id !== id) return equipo;
                const cantidadActual = equipo.cantidad ?? 1;
                return { ...equipo, cantidad: cantidadActual > 1 ? cantidadActual - 1 : 1 };
            }),
        }));
    };

    const toggleEstacion = (id: number | string) => {
        const idNum = Number(id);
        setForm(prev => {
            const actuales = (prev.estaciones || []).map(Number);
            const yaSeleccionada = actuales.includes(idNum);
            return { ...prev, estaciones: yaSeleccionada ? actuales.filter(e => e !== idNum) : [...actuales, idNum] };
        });
    };

    const set = (field: keyof FormData, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

    const handleTipo = (t: TipoActividad) => {
        setTipo(t);
        setStepIndex(0);
        setForm({
            tipo: t,
            numPersonas: t === "clase" ? 20 : 3,
            recurrencia: "No se repite",
            equipos: [],
            estaciones: [],
            desde: t === "clase" ? "08:00" : t === "mantenimiento" ? "14:00" : "09:00",
            hasta: t === "clase" ? "10:00" : t === "mantenimiento" ? "17:00" : "11:00",
        });
    };

    const steps = tipo ? STEPS[tipo] : [];
    const currentStepKey = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;

    const laboratorioSeleccionado = labsDesdeBD.find(l => l.id.toString() === form.laboratorio?.toString());
    const modoReserva: ModoReserva = laboratorioSeleccionado?.modo_reserva || "por_estacion";

    const handleAtras = () => {
        if (stepIndex === 0) {
            setTipo(null);
            setForm({ tipo: null, numPersonas: 20, recurrencia: "No se repite", equipos: [], estaciones: [] });
        } else {
            setStepIndex(i => i - 1);
        }
    };

    const handleGuardar = () => {
        onGuardar({ ...form, tipo });
        onClose();
    };

    const handleSiguiente = () => {
        if (isLastStep) handleGuardar();
        else setStepIndex(i => i + 1);
    };

    const canAvanzar = (): boolean => {
        if (!tipo) return false;
        if (currentStepKey === "datos") {
            if (tipo === "clase") return !!form.materia && !!form.docente;
            if (tipo === "mantenimiento") return !!form.responsable && !!form.descripcion;
            if (tipo === "reserva") return !!form.titulo;
        }
        if (currentStepKey === "laboratorio") {
            if (!form.laboratorio) return false;
            if (tipo === "reserva" && modoReserva === "por_estacion") return estacionesSeleccionadas.length > 0;
        }
        if (currentStepKey === "horario") return !!form.fecha;
        return true;
    };

    const canSave = canAvanzar();

    return {
        form, set, tipo, stepIndex,
        labsDesdeBD, cargandoLabs,
        estacionesDesdeBD, cargandoEstaciones,
        inventarioDesdeBD, cargandoInventario,
        tecnicosOptions, docentesOptions,
        estacionesOcupadas, bloqueoTotal, verificando, mostrarSoloDisponibles, setMostrarSoloDisponibles,
        equiposSeleccionados, estacionesSeleccionadas,
        agregarEquipo, quitarEquipo, aumentarCantidad, disminuirCantidad, toggleEstacion,
        handleTipo, handleAtras, handleSiguiente, canSave,
        steps, currentStepKey, isLastStep, laboratorioSeleccionado, modoReserva
    };
}