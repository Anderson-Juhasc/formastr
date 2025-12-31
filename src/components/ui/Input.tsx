import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // Sizing
          'w-full h-11 px-4 py-2',
          // Shape
          'rounded-xl',
          // Border
          'border border-border',
          // Surface
          'bg-background text-foreground',
          // Placeholder
          'placeholder:text-muted-foreground/70',
          // Focus state
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary',
          // Hover state
          'hover:border-muted-foreground/50',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          // Transition
          'transition-all',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
