import React from 'react';
import { cn } from '../../utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CyberCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  holographic?: boolean;
  children?: React.ReactNode;
}

export const CyberCard = React.forwardRef<HTMLDivElement, CyberCardProps>(
  ({ className, holographic = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'cp-card relative backdrop-blur-sm bg-opacity-90',
          holographic && 'border-[var(--cp-border-holographic)] shadow-[var(--cp-glow-cyan)]',
          className
        )}
        {...props}
      >
        {children}
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--cp-accent-amber-400)]" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--cp-accent-amber-400)]" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--cp-accent-amber-400)]" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--cp-accent-amber-400)]" />
      </motion.div>
    );
  }
);

CyberCard.displayName = 'CyberCard';
