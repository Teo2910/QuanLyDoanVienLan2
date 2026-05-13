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
          "w-full flex items-center justify-between px-7 py-5 bg-slate-50 border border-slate-200 rounded-[1.8rem] transition-all focus:outline-none relative group",
          isOpen ? "ring-4 ring-accent/5 border-accent bg-white shadow-xl" : "hover:bg-slate-100/50 hover:border-slate-300",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span className={cn(
          "text-[15px] font-bold tracking-tight",
          selectedOption ? "text-slate-900" : "text-slate-300"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0, scale: isOpen ? 1.2 : 1 }}
          transition={{ duration: 0.3, ease: "backOut" }}
          className={cn("transition-colors", isOpen ? "text-accent" : "text-slate-300")}
        >
          <ChevronDown size={18} strokeWidth={2.5} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 10, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute z-[110] w-full bg-white border border-slate-200 rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] overflow-hidden p-3"
          >
            <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1 focus:outline-none touch-pan-y overscroll-contain">
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
                    "w-full text-left px-5 py-4 rounded-2xl text-[14px] transition-all flex items-center justify-between group relative",
                    value === option.value 
                      ? "bg-slate-900 text-white font-black shadow-lg shadow-slate-900/10" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold"
                  )}
                >
                  <span className="relative z-10">{option.label}</span>
                  {value === option.value ? (
                    <motion.div 
                      layoutId="active-indicator"
                      className="w-2 h-2 rounded-full bg-accent animate-pulse" 
                    />
                  ) : (
                    <ChevronDown className="opacity-0 group-hover:opacity-100 -rotate-90 text-slate-300 transition-all" size={14} />
                  )}
                </button>
              ))}
              {options.length === 0 && (
                <div className="px-4 py-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <X size={20} />
                  </div>
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black italic">
                    Dữ liệu trống
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
