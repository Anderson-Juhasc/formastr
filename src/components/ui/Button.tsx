import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all cursor-pointer',
        // Focus: uses ring token
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        // Variants
        {
          // Primary: bold, high contrast
          'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:bg-primary/80':
            variant === 'primary',
          // Secondary: subtle background, strong text
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70':
            variant === 'secondary',
          // Outline: bordered, transparent bg
          'border-2 border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80':
            variant === 'outline',
          // Ghost: minimal, text only
          'text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80':
            variant === 'ghost',
          // Destructive: error/delete actions
          'bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 active:bg-destructive/80':
            variant === 'destructive',
        },
        // Sizes
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-sm': size === 'md',
          'h-12 px-6 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
