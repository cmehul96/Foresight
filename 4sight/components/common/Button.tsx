
import React from 'react';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'filled',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary transition-colors duration-150 ease-in-out select-none";
  
  const variantStyles = {
    filled: `bg-primary text-on-primary ${!disabled ? 'hover:shadow-md hover:bg-opacity-90' : 'opacity-50 cursor-not-allowed'}`,
    tonal: `bg-secondary-container text-on-secondary-container ${!disabled ? 'hover:bg-opacity-80' : 'opacity-50 cursor-not-allowed'}`,
    outlined: `border border-outline text-primary ${!disabled ? 'hover:bg-primary-container hover:text-on-primary-container' : 'opacity-50 cursor-not-allowed'}`,
    text: `text-primary ${!disabled ? 'hover:bg-primary-container hover:bg-opacity-20' : 'opacity-50 cursor-not-allowed'}`,
    elevated: `bg-surface-container-low text-primary shadow-md ${!disabled ? 'hover:shadow-lg hover:bg-surface-container' : 'opacity-50 cursor-not-allowed'}`,
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs h-8", // Approx 32px height
    md: "px-4 py-2 text-sm h-10", // Approx 40px height
    lg: "px-6 py-3 text-base h-12", // Approx 48px height
  };

  // Adjusted for Material Symbols using font-size
  const iconSizeStyles = {
    sm: "text-sm", // Approx 16-18px icon
    md: "text-base", // Approx 18-20px icon
    lg: "text-lg", // Approx 20-22px icon
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {leftIcon && <span className={`inline-flex items-center justify-center mr-2 ${iconSizeStyles[size]}`}>{React.cloneElement(leftIcon as React.ReactElement<React.HTMLAttributes<HTMLElement>>, { className: iconSizeStyles[size] })}</span>}
      <span className="truncate">{children}</span>
      {rightIcon && <span className={`inline-flex items-center justify-center ml-2 ${iconSizeStyles[size]}`}>{React.cloneElement(rightIcon as React.ReactElement<React.HTMLAttributes<HTMLElement>>, { className: iconSizeStyles[size] })}</span>}
    </button>
  );
};

export default Button;
