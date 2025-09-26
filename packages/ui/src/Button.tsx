import type { ButtonHTMLAttributes, ReactNode } from 'react';
import React from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

const baseStyles = 'rounded-md px-4 py-2 font-medium focus:outline-none focus-visible:ring-2';
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400'
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...rest }) => (
  <button className={`${baseStyles} ${variants[variant]} ${className}`.trim()} {...rest}>
    {children}
  </button>
);

Button.displayName = 'Button';
