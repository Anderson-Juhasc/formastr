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
        'inline-flex items-center justify-center rounded-xl font-medium transition-all cursor-pointer',
        // Focus styles
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        // Active state feedback
        'active:scale-[0.98]',
        // Variants
        {
          // Primary: gradient with glow
          'bg-primary text-primary-foreground shadow-[var(--shadow)] hover:shadow-[var(--shadow-md)] hover:brightness-110':
            variant === 'primary',
          // Secondary: subtle with hover
          'bg-secondary text-secondary-foreground hover:bg-secondary/80':
            variant === 'secondary',
          // Outline: clean border
          'border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20':
            variant === 'outline',
          // Ghost: minimal
          'text-foreground hover:bg-muted':
            variant === 'ghost',
          // Destructive
          'bg-destructive text-destructive-foreground shadow-[var(--shadow)] hover:shadow-[var(--shadow-md)] hover:brightness-110':
            variant === 'destructive',
        },
        // Sizes
        {
          'h-8 px-3 text-sm gap-1.5': size === 'sm',
          'h-10 px-4 text-sm gap-2': size === 'md',
          'h-12 px-6 text-base gap-2': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
