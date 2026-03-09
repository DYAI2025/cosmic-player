import React from 'react';
import { cn } from '../../utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CyberButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: 'primary' | 'secondary' | 'ghost';
  glow?: boolean;
  children?: React.ReactNode;
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = 'primary', glow = false, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'cp-button relative overflow-hidden group',
          glow && 'shadow-[var(--cp-glow-sm)] hover:shadow-[var(--cp-glow-md)]',
          className
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        <div className="absolute inset-0 bg-[var(--cp-accent-amber-400)] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      </motion.button>
    );
  }
);

CyberButton.displayName = 'CyberButton';
