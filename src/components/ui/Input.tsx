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
          'w-full h-10 px-4 py-2',
          // Shape
          'rounded-lg',
          // Border: uses input token (darker than border for emphasis)
          'border-2 border-input',
          // Surface
          'bg-card text-card-foreground',
          // Shadow for depth
          'shadow-sm',
          // Placeholder: muted but readable
          'placeholder:text-muted-foreground',
          // Focus state
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          // Transition
          'transition-shadow transition-colors',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
