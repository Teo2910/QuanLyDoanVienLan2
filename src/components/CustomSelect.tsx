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
        <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 block">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl transition-all focus:outline-none",
          isOpen ? "ring-1 ring-accent/50 border-accent/30" : "hover:bg-white/[0.07]",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span className={cn(
          "text-sm font-medium",
          selectedOption ? "text-white/80" : "text-white/20"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="text-white/20" size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[110] w-full mt-2 bg-surface/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
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
                      ? "bg-accent/15 text-accent font-bold" 
                      : "text-white/60 hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  <span className="relative z-10">{option.label}</span>
                  {value === option.value && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(59,130,246,0.6)]" 
                    />
                  )}
                </button>
              ))}
              {options.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-white/20 uppercase tracking-widest font-bold">
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
