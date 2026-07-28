import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { alertasService } from '../../services/alertas.service';
import { customToast } from '../custom-toast/CustomToast';

interface ReportarItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: any;
}

export const ReportarItemModal: React.FC<ReportarItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  item
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tipo_problema: 'daño',
    descripcion: '',
    cantidad_afectada: 1
  });

  if (!isOpen || !item) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cantidad_afectada' ? parseInt(value) || 1 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descripcion.trim()) {
      customToast.error('Debes proporcionar una descripción del problema.');
      return;
    }
    
    if (formData.cantidad_afectada < 1 || formData.cantidad_afectada > item.cantidad_actual) {
      customToast.error(`La cantidad debe ser mayor a 0 y no exceder el stock actual (${item.cantidad_actual}).`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        item_id: item.id,
        tipo_problema: formData.tipo_problema,
        descripcion: formData.descripcion,
        cantidad_afectada: formData.cantidad_afectada
      };

      const result = await alertasService.crearAlerta(payload);

      if (result && result.status === 'success') {
        customToast.success('Alerta reportada con éxito');
        onSuccess();
        onClose();
        setFormData({ tipo_problema: 'daño', descripcion: '', cantidad_afectada: 1 });
      } else {
        customToast.error(result.message || 'Error al reportar la alerta');
      }
    } catch (error) {
      customToast.error('Ocurrió un error inesperado');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .report-input {
          width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0;
          border-radius: 8px; font-size: 14px; color: #1e293b;
          transition: all 0.2s ease; outline: none; background: #fff;
          box-sizing: border-box;
        }
        .report-input:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .report-label {
          display: block; font-size: 13px; font-weight: 600;
          color: #475569; margin-bottom: 6px; letter-spacing: 0.3px;
        }
        .btn-report-submit {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white; border: none; padding: 10px 20px;
          border-radius: 8px; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
        }
        .btn-report-submit:hover:not(:disabled) {
          transform: translateY(-1px); box-shadow: 0 6px 12px -2px rgba(239, 68, 68, 0.4);
        }
        .btn-report-submit:disabled {
          opacity: 0.6; cursor: not-allowed;
        }
        .btn-report-cancel {
          background: #f1f5f9; color: #475569; border: none;
          padding: 10px 20px; border-radius: 8px; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease;
        }
        .btn-report-cancel:hover:not(:disabled) {
          background: #e2e8f0; color: #1e293b;
        }
      `}</style>

      <div className="modal-content" style={{
        background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '450px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'slideUp 0.3s ease-out', padding: '24px', position: 'relative'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              background: '#fef2f2', padding: '8px', borderRadius: '10px', 
              color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <AlertTriangle size={22} strokeWidth={2.5} />
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Reportar Ítem</h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            style={{ 
              background: 'transparent', border: 'none', color: '#94a3b8', 
              cursor: 'pointer', padding: '4px', borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Tarjeta de Info del Ítem */}
          <div style={{ 
            background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', 
            padding: '16px', borderRadius: '12px', marginBottom: '24px', 
            border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ítem a reportar
            </span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
              {item.nombre} <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Cód: {item.codigo_interno})</span>
            </span>
            <span style={{ fontSize: '13px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.cantidad_actual > 0 ? '#10b981' : '#ef4444' }} />
              Stock actual: <strong style={{ color: '#0f172a' }}>{item.cantidad_actual} {item.unidad_medida}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Tipo de Problema */}
            <div>
              <label htmlFor="tipo_problema" className="report-label">Tipo de Problema</label>
              <select
                id="tipo_problema"
                name="tipo_problema"
                value={formData.tipo_problema}
                onChange={handleChange}
                className="report-input"
                required
                disabled={isSubmitting}
              >
                <option value="daño">Daño / Desgaste</option>
                <option value="extravio">Extravío / Pérdida</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Cantidad */}
            <div>
              <label htmlFor="cantidad_afectada" className="report-label">Cantidad Afectada</label>
              <input
                type="number"
                id="cantidad_afectada"
                name="cantidad_afectada"
                min="1"
                max={item.cantidad_actual > 0 ? item.cantidad_actual : 1}
                value={formData.cantidad_afectada}
                onChange={handleChange}
                className="report-input"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="descripcion" className="report-label">Descripción del Problema</label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="report-input"
                rows={3}
                placeholder="Ej: El equipo tiene el cable pelado por desgaste natural..."
                required
                disabled={isSubmitting}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>

          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-report-cancel"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-report-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Reportando...' : 'Reportar Alerta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
