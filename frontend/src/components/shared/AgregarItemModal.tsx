import React, { useState, useEffect } from 'react';
import { Calendar, Monitor, FlaskConical, X, Upload } from 'lucide-react';
import { inventarioService } from '../../services/inventario.service';
import { laboratoriosService } from '../../services/laboratorios.service';
import type { Laboratorio } from '../../types/laboratorio.types';
import { customToast, CustomToastProvider } from '../custom-toast/CustomToast';
import { ConfirmModal } from '../confirm-modal/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import '../../css/inventario.css';

const OPCIONES_UNIDAD_MEDIDA: Record<string, {value: string, label: string}[]> = {
  'Mobiliario': [{value: 'Unidad', label: 'Unidades'}, {value: 'Juego', label: 'Juegos'}],
  'Electrónica': [{value: 'Unidad', label: 'Unidades'}, {value: 'Kit', label: 'Kits'}],
  'Instrumentos': [{value: 'Unidad', label: 'Unidades'}, {value: 'Kit', label: 'Kits'}, {value: 'Cajas', label: 'Cajas'}],
  'Reactivos': [{value: 'Litros', label: 'Litros'}, {value: 'Mililitros', label: 'Mililitros'}, {value: 'Gramos', label: 'Gramos'}, {value: 'Kilogramos', label: 'Kilogramos'}, {value: 'Galones', label: 'Galones'}, {value: 'Frasco', label: 'Frascos'}],
  'Insumos': [{value: 'Unidad', label: 'Unidades'}, {value: 'Cajas', label: 'Cajas'}, {value: 'Paquete', label: 'Paquetes'}, {value: 'Litros', label: 'Litros'}, {value: 'Mililitros', label: 'Mililitros'}, {value: 'Gramos', label: 'Gramos'}, {value: 'Kilogramos', label: 'Kilogramos'}],
  '': [{value: 'Unidad', label: 'Unidades'}, {value: 'Litros', label: 'Litros'}, {value: 'Mililitros', label: 'Mililitros'}, {value: 'Gramos', label: 'Gramos'}, {value: 'Kilogramos', label: 'Kilogramos'}, {value: 'Cajas', label: 'Cajas'}, {value: 'Galones', label: 'Galones'}]
};

interface AgregarItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editData?: any;
}

export const AgregarItemModal: React.FC<AgregarItemModalProps> = ({ isOpen, onClose, onSuccess, editData }) => {
  const { user } = useAuth();
  const [tipoItem, setTipoItem] = useState<'general' | 'instrumentacion'>('general');
  const [loading, setLoading] = useState(false);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [isConfirmUpdateOpen, setIsConfirmUpdateOpen] = useState(false);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [codigoInterno, setCodigoInterno] = useState('');
  const [numeroCas, setNumeroCas] = useState('');
  const [ubicacionFisica, setUbicacionFisica] = useState('');
  const [categoria, setCategoria] = useState('');
  const [laboratorioId, setLaboratorioId] = useState('');
  const [cantidad, setCantidad] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const [unidadMedida, setUnidadMedida] = useState('Unidad');
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarLaboratorios();
      if (editData) {
        setTipoItem(editData.tipo_control === 'instrumentacion' ? 'instrumentacion' : 'general');
        setNombre(editData.nombre || '');
        setCodigoInterno(editData.codigo_interno || '');
        setNumeroCas(editData.numero_cas || '');
        setUbicacionFisica(editData.ubicacion_fisica || '');
        setCategoria(editData.categoria || '');
        setLaboratorioId(editData.laboratorio_id || '');
        setCantidad(editData.cantidad_actual || 0);
        setStockMinimo(editData.stock_minimo || 0);
        setUnidadMedida(editData.unidad_medida || 'Unidad');
        setImagenPreview(editData.imagen_url ? (editData.imagen_url.startsWith('http') ? editData.imagen_url : `http://localhost:4000${editData.imagen_url}`) : null);
        setImagenFile(null);
      } else {
        limpiarFormulario();
      }
    }
  }, [isOpen, editData]);

  useEffect(() => {
    const opciones = OPCIONES_UNIDAD_MEDIDA[categoria] || OPCIONES_UNIDAD_MEDIDA[''];
    if (categoria && !opciones.some(op => op.value === unidadMedida)) {
      setUnidadMedida(opciones[0].value);
    }
  }, [categoria]);

  const cargarLaboratorios = async () => {
    try {
      const response = await laboratoriosService.getLaboratorios();
      if (response.success || (response as any).status === 'success') {
        const labs = response.data || (response as any).data;
        if (user?.rol === 'coordinador') {
          setLaboratorios(labs.filter((lab: any) => lab.coordinador_id === user.id));
        } else {
          setLaboratorios(labs);
        }
      }
    } catch (error) {
      console.error("Error al cargar laboratorios", error);
    }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setCodigoInterno('');
    setNumeroCas('');
    setUbicacionFisica('');
    setCategoria('');
    setLaboratorioId('');
    setCantidad(0);
    setStockMinimo(0);
    setUnidadMedida('Unidad');
    setImagenFile(null);
    setImagenPreview(null);
  };

  const handleGuardar = () => {
    if (!nombre || !codigoInterno || !categoria || !laboratorioId) {
      customToast.error("Atención", "Por favor, complete los campos obligatorios.");
      return;
    }

    if (editData) {
      setIsConfirmUpdateOpen(true);
    } else {
      executeGuardar();
    }
  };

  const executeGuardar = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('laboratorio_id', laboratorioId);
      formData.append('nombre', nombre);
      formData.append('codigo_interno', codigoInterno);
      if (tipoItem === 'instrumentacion' && numeroCas) formData.append('numero_cas', numeroCas);
      formData.append('categoria', categoria);
      formData.append('ubicacion_fisica', ubicacionFisica);
      formData.append('unidad_medida', unidadMedida);
      formData.append('tipo_control', tipoItem === 'instrumentacion' ? 'instrumentacion' : 'general');
      formData.append('cantidad_actual', cantidad.toString());
      formData.append('stock_minimo', stockMinimo.toString());
      
      if (imagenFile) {
        formData.append('imagen', imagenFile);
      } else if (editData?.imagen_url) {
        formData.append('imagen_url', editData.imagen_url);
      }

      if (editData) {
        await inventarioService.actualizarItem(editData.id, formData);
        customToast.success("¡Éxito!", "Ítem actualizado exitosamente");
      } else {
        await inventarioService.crearItem(formData);
        customToast.success("¡Éxito!", "Ítem guardado exitosamente");
      }
      
      limpiarFormulario();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      customToast.error("Error", error.message || "Error al guardar el ítem");
    } finally {
      setLoading(false);
      setIsConfirmUpdateOpen(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <CustomToastProvider />
      <ConfirmModal 
        isOpen={isConfirmUpdateOpen}
        title="Actualizar información"
        message="¿Estás seguro que deseas actualizar esta información?"
        confirmText="Actualizar"
        cancelText="Cancelar"
        type="info"
        onConfirm={executeGuardar}
        onCancel={() => setIsConfirmUpdateOpen(false)}
      />
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content add-item-modal">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 className="add-item-title" style={{ margin: 0 }}>{editData ? 'Editar ítem del inventario' : 'Agregar ítem al inventario'}</h2>
              <button className="modal-close" onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#008f7a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="add-item-body">
          {/* Tipo de ítem */}
          <div className="form-section">
            <h3 className="section-title">Tipo de ítem</h3>
            <div className="type-selector-container">
              <div 
                className={`type-card ${tipoItem === 'general' ? 'active' : ''}`}
                onClick={() => setTipoItem('general')}
              >
                <Monitor className="type-icon" size={28} />
                <div className="type-name">ítem general</div>
                <div className="type-desc">PC, sillas mobiliario...</div>
              </div>

              <div 
                className={`type-card ${tipoItem === 'instrumentacion' ? 'active' : ''}`}
                onClick={() => setTipoItem('instrumentacion')}
              >
                <FlaskConical className="type-icon" size={28} />
                <div className="type-name">Instrumentacion</div>
                <div className="type-desc">Equipos con N° CAS</div>
              </div>
            </div>
          </div>

          {/* IDENTIFICACION */}
          <div className="form-section">
            <h3 className="section-title">IDENTIFICACION</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>NOMBRE DEL ITEM</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={tipoItem === 'general' ? "Ej. Computadora de escritorio" : "Ej. Osciloscopio digital"}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>CÓDIGO INTERNO</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. CCE-002"
                  value={codigoInterno}
                  onChange={(e) => setCodigoInterno(e.target.value)}
                />
              </div>

              {tipoItem === 'instrumentacion' && (
                <>
                  <div className="form-group">
                    <label>N° CAS (Opcional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. 7773-84-3"
                      value={numeroCas}
                      onChange={(e) => setNumeroCas(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ubicación física (Opcional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. Mesa 1, estante a o fila 1 lado derecho"
                      value={ubicacionFisica}
                      onChange={(e) => setUbicacionFisica(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>{tipoItem === 'general' ? 'CATEGORIA' : 'Categoría'}</label>
                <select 
                  className="form-input select-input"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="">Seleccione la categoria</option>
                  <option value="Mobiliario">Mobiliario</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Instrumentos">Instrumentos</option>
                  <option value="Reactivos">Reactivos</option>
                  <option value="Insumos">Insumos</option>
                </select>
              </div>
              <div className="form-group">
                <label>LABORATORIO</label>
                <select 
                  className="form-input select-input"
                  value={laboratorioId}
                  onChange={(e) => setLaboratorioId(e.target.value)}
                >
                  <option value="">Seleccione laboratorio</option>
                  {laboratorios.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>



          {/* UBICACIÓN FÍSICA (Solo en ítem general) */}
          {tipoItem === 'general' && (
            <div className="form-section">
              <h3 className="section-title">UBICACIÓN FÍSICA</h3>
              <div className="form-group">
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. Mesa 1, estante a o fila 1 lado derecho"
                  value={ubicacionFisica}
                  onChange={(e) => setUbicacionFisica(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STOCK */}
          <div className="form-section">
            <h3 className="section-title">Stock</h3>
            {/* Usamos cols-3 y reemplazamos Estado por Unidad de Medida temporalmente */}
            <div className="form-grid cols-3">
              <div className="form-group">
                <label>CANTIDAD</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>STOCK MINIMO</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>UNIDAD DE MEDIDA</label>
                <select 
                  className="form-input select-input"
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                >
                  {(OPCIONES_UNIDAD_MEDIDA[categoria] || OPCIONES_UNIDAD_MEDIDA['']).map(opcion => (
                    <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* IMAGEN */}
          <div className="form-section">
            <h3 className="section-title">IMAGEN (OPCIONAL)</h3>
            <div className="image-upload-area" onClick={() => document.getElementById('item-image-upload')?.click()}>
              {imagenPreview ? (
                <img src={imagenPreview} alt="Preview" style={{ maxHeight: '150px', borderRadius: '6px' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Upload size={24} />
                  <span>Haz clic para subir una imagen</span>
                </div>
              )}
              <input 
                id="item-image-upload" 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleImageChange}
              />
            </div>
          </div>

        </div>
        
        <div className="modal-footer actions-footer">
          <button className="btn-cancel-modal" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn-save-modal" onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
      )}
    </>
  );
};
