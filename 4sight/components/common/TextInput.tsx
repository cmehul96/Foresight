import React, { useState, useId } from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id?: string;
  error?: string | boolean;
  leadingIcon?: React.ReactNode;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  id,
  error,
  leadingIcon,
  className = '',
  onFocus,
  onBlur,
  value,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };
  
  const isLabelFloated = isFocused || hasValue;

  const labelBaseClasses = "absolute transition-all duration-200 ease-in-out pointer-events-none";
  // Apply consistent font sizing for floating label from Material Design 3 theme
  const labelFloatedClasses = "transform -translate-y-3 scale-75 top-3 text-xs sm:text-sm"; 
  const labelStaticClasses = "transform scale-100 top-1/2 -translate-y-1/2 text-base sm:text-lg"; // Adjusted for input padding
  
  const labelColor = error ? 'text-error' : (isFocused ? 'text-primary' : 'text-on-surface-variant');
  const borderColor = error ? 'border-error' : (isFocused ? 'border-primary' : 'border-outline');

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {leadingIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.cloneElement(leadingIcon as React.ReactElement<{ className?: string }>, {
              className: `text-lg ${error ? 'text-error' : (isFocused ? 'text-primary' : 'text-on-surface-variant')}` // Use font-size for Material Symbols
            })}
          </div>
        )}
        <input
          id={inputId}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          className={`
            block w-full 
            pt-5 pb-2 px-3 
            ${leadingIcon ? 'pl-10' : ''}
            text-on-surface bg-surface-container-highest // Changed background to match TextArea for dark theme contrast
            rounded-t-lg border-b-2 
            focus:outline-none focus:ring-0
            placeholder-transparent
            ${borderColor}
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          placeholder={label} // Used for accessibility, label is visually the placeholder
          {...props}
        />
        <label
          htmlFor={inputId}
          className={`
            ${labelBaseClasses}
            ${isLabelFloated ? labelFloatedClasses : labelStaticClasses}
            ${labelColor}
            ${leadingIcon ? (isLabelFloated ? 'left-3' : 'left-10') : 'left-3'}
            origin-top-left
          `}
        >
          {label}
        </label>
      </div>
      {typeof error === 'string' && error && (
        <p className="mt-1 text-xs text-error">{error}</p>
      )}
    </div>
  );
};

export default TextInput;
