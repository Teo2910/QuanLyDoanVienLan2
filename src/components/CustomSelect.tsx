import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Chọn...", 
  label,
  className,
  disabled = false
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", isOpen ? "z-[120]" : "z-10", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all focus:outline-none",
          isOpen ? "ring-4 ring-accent/10 border-accent shadow-sm" : "hover:bg-slate-100",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span className={cn(
          "text-sm font-bold",
          selectedOption ? "text-slate-900" : "text-slate-300"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="text-slate-300" size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[110] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1.5 focus:outline-none touch-pan-y overscroll-contain">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between group relative",
                    value === option.value 
                      ? "bg-accent text-white font-bold" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span className="relative z-10">{option.label}</span>
                  {value === option.value && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" 
                    />
                  )}
                </button>
              ))}
              {options.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-300 uppercase tracking-widest font-bold">
                  Không có dữ liệu
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
