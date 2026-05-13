import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'info'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white border border-slate-200 rounded-[3rem] p-12 max-w-lg w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute top-0 left-0 w-full h-1.5",
              variant === 'danger' ? "bg-red-500" : "bg-accent"
            )} />

            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "p-5 rounded-3xl mb-8",
                variant === 'danger' ? "bg-red-50 text-red-500" : "bg-accent/10 text-accent"
              )}>
                <AlertTriangle size={40} />
              </div>
              
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight leading-tight">{title}</h3>
              <p className="text-slate-500 mb-10 leading-relaxed font-medium">{message}</p>
              
              <div className="flex gap-4 w-full">
                <motion.button
                  whileHover={{ scale: 1.02, x: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 px-8 py-5 rounded-[1.5rem] bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all border border-slate-100"
                >
                  {cancelLabel}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onConfirm();
                    onCancel(); 
                  }}
                  className={cn(
                    "flex-1 px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all shadow-xl",
                    variant === 'danger' 
                      ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20" 
                      : "bg-accent text-white hover:bg-blue-700 shadow-accent/20"
                  )}
                >
                  {confirmLabel}
                </motion.button>
              </div>
            </div>
            
            <button 
              onClick={onCancel}
              className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-all hover:rotate-90"
            >
              <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
