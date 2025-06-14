
import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
}

const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  from = 'from-purple-500',
  via = 'via-pink-500',
  to = 'to-red-500'
}) => {
  return (
    <span
      className={`bg-gradient-to-r ${from} ${via} ${to} bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
};

export default GradientText;
