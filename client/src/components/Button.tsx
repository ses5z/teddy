import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const VARIANTS = {
  primary: 'bg-primary text-on-primary border-primary',
  secondary: 'bg-transparent text-primary border-primary hover:bg-tint',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 cursor-pointer rounded border px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
