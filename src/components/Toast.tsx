import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  onClose: (id: string) => void;
  duration?: number;
}

const toastIcons = {
  success: <CheckCircle2 className="text-green-400" size={18} />,
  error: <AlertCircle className="text-red-400" size={18} />,
  info: <Info className="text-blue-400" size={18} />,
  warning: <AlertTriangle className="text-yellow-400" size={18} />,
};

export const Toast: React.FC<ToastProps> = ({ id, message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border min-w-[300px] max-w-md",
        "bg-surface/80 border-white/10"
      )}
    >
      <div className="flex-shrink-0">
        {toastIcons[type]}
      </div>
      <div className="flex-grow">
        <p className="text-sm font-medium text-white leading-tight">{message}</p>
      </div>
      <button 
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-white/20 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC<{ toasts: any[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast) => (
          <Toast 
            key={toast.id} 
            {...toast} 
            onClose={removeToast} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
