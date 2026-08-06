import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirmar acción',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  onConfirm,
  onCancel,
  onClose
}) => {
  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };
  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 size={24} />;
      case 'warning':
        return <AlertTriangle size={24} />;
      case 'info':
      default:
        return <Info size={24} />;
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={handleCancel}>
      <div 
        className="confirm-modal-content"
        onClick={(e) => e.stopPropagation()} // Evitar que el click cierre el modal
      >
        <div className="confirm-modal-header">
          <div className={`icon-container ${type}`}>
            {renderIcon()}
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        
        <p className="confirm-modal-message">{message}</p>
        
        <div className="confirm-modal-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={handleCancel}>
            {cancelText}
          </button>
          <button 
            className={`confirm-btn confirm-btn-${type}`} 
            onClick={() => {
              onConfirm();
              handleCancel();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
