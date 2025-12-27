import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ children, className }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          // Surface: white in light mode, dark zinc in dark mode
          'bg-card text-card-foreground',
          // Border: visible, uses border token
          'rounded-xl border-2 border-border',
          // Padding and shadow
          'p-4 shadow-md',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

// Additional card sub-components for complex layouts
export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight text-card-foreground', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('text-card-foreground', className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div className={cn('flex items-center pt-4', className)}>
      {children}
    </div>
  );
}
