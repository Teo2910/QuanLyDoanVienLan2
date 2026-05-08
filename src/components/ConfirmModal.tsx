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
            className="relative bg-surface border border-white/10 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl overflow-hidden"
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute top-0 left-0 w-full h-1",
              variant === 'danger' ? "bg-red-500" : "bg-accent"
            )} />

            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "p-4 rounded-full mb-6",
                variant === 'danger' ? "bg-red-500/10 text-red-500" : "bg-accent/10 text-accent"
              )}>
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
              <p className="text-white/60 mb-10 leading-relaxed">{message}</p>
              
              <div className="flex gap-4 w-full">
                <motion.button
                  whileHover={{ scale: 1.02, x: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 px-8 py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
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
                    "flex-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl border border-white/10",
                    variant === 'danger' 
                      ? "bg-red-500 text-white hover:bg-white hover:text-red-600 shadow-red-500/20 group" 
                      : "bg-accent text-slate-950 hover:bg-white shadow-accent/20"
                  )}
                >
                  {confirmLabel}
                </motion.button>
              </div>
            </div>
            
            <button 
              onClick={onCancel}
              className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
