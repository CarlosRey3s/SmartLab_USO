import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';
import './CustomToast.css';

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface CustomToastProps {
  toast: ToastMessage;
  onClose: (id: number) => void;
  duration?: number;
}

const ToastItem: React.FC<CustomToastProps> = ({ 
  toast, 
  onClose,
  duration = 3000
}) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const isSuccess = toast.type === 'success';
  const isInfo = toast.type === 'info';
  const isError = toast.type === 'error';

  return (
    <div className={`premium-toast ${isClosing ? 'closing' : ''} ${isError ? 'error-toast' : ''} ${isInfo ? 'info-toast' : ''}`}>
      <div className="icon">
        {isSuccess && <CheckCircle size={24} color="#fff" />}
        {isError && <AlertCircle size={24} color="#fff" />}
        {isInfo && <Info size={24} color="#fff" />}
      </div>
      <div className="content">
        <h4>{toast.title}</h4>
        <p>{toast.message}</p>
      </div>
      <div className="close" onClick={handleClose}>
        <X size={20} color="#fff" />
      </div>
      <div className="progress">
        <div 
          className="progress-fill" 
          style={{ 
            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', 
            background: isSuccess ? '#7ed49e' : (isInfo ? '#60a5fa' : '#fca5a5'), transformOrigin: 'left',
            animation: `fillProgress ${duration}ms linear forwards`
          }} 
        />
      </div>
    </div>
  );
};

// Event system for toasts
type ToastListener = (toast: ToastMessage) => void;
let listeners: ToastListener[] = [];

export const customToast = {
  success: (titleOrMessage: string, message?: string) => {
    const finalTitle = message ? titleOrMessage : 'Éxito';
    const finalMessage = message ? message : titleOrMessage;
    const toast: ToastMessage = { id: Date.now(), title: finalTitle, message: finalMessage, type: 'success' };
    listeners.forEach(l => l(toast));
  },
  error: (titleOrMessage: string, message?: string) => {
    const finalTitle = message ? titleOrMessage : 'Error';
    const finalMessage = message ? message : titleOrMessage;
    const toast: ToastMessage = { id: Date.now(), title: finalTitle, message: finalMessage, type: 'error' };
    listeners.forEach(l => l(toast));
  },
  info: (titleOrMessage: string, message?: string) => {
    const finalTitle = message ? titleOrMessage : 'Información';
    const finalMessage = message ? message : titleOrMessage;
    const toast: ToastMessage = { id: Date.now(), title: finalTitle, message: finalMessage, type: 'info' };
    listeners.forEach(l => l(toast));
  }
};

export const CustomToastProvider: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast]);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="custom-toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>,
    document.body
  );
};
