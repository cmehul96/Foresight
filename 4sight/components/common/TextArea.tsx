import React, { useState, useId } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id?: string;
  error?: string | boolean;
  rows?: number;
}

const TextArea: React.FC<TextAreaProps> = ({
  label,
  id,
  error,
  rows = 4,
  className = '',
  onFocus,
  onBlur,
  value,
  ...props
}) => {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const isLabelFloated = isFocused || hasValue;

  const labelBaseClasses = "absolute transition-all duration-200 ease-in-out pointer-events-none left-3";
  const labelFloatedClasses = "transform -translate-y-3 scale-75 top-3 text-xs sm:text-sm"; // Adjusted font size when floated
  const labelStaticClasses = "transform scale-100 top-5 text-base sm:text-lg"; // Adjusted for textarea padding

  const labelColor = error ? 'text-error' : (isFocused ? 'text-primary' : 'text-on-surface-variant');
  const borderColor = error ? 'border-error' : (isFocused ? 'border-primary' : 'border-outline'); // Added border-outline for static state

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <textarea
          id={textareaId}
          rows={rows}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          className={`
            block w-full
            pt-5 pb-2 px-3
            text-on-surface bg-surface-container-highest // Changed background to highest, text-on-surface for contrast
            rounded-t-lg border-b-2
            focus:outline-none focus:ring-0
            placeholder-transparent
            resize-y
            ${borderColor}
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          placeholder={label} // Used for accessibility
          {...props}
        />
        <label
          htmlFor={textareaId}
          className={`
            ${labelBaseClasses}
            ${isLabelFloated ? labelFloatedClasses : labelStaticClasses}
            ${labelColor}
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

export default TextArea;
