
import React, { useEffect } from 'react';

interface SpeakingIndicatorProps {
  isActive: boolean;
  className?: string;
  size?: number; //Approximate diameter in pixels
}

const SpeakingIndicator: React.FC<SpeakingIndicatorProps> = ({ isActive, className = '', size = 24 }) => {
  useEffect(() => {
    const styleId = 'speaking-indicator-orb-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.type = 'text/css';
      styleSheet.innerText = `
        @keyframes orb-pulse {
          0% { transform: scale(0.8); opacity: 0.7; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.7; }
        }
        @keyframes orb-pulse-outer {
          0% { transform: scale(0.9); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(0.9); opacity: 0.3; }
        }
        .animate-orb-pulse {
          animation: orb-pulse 1.5s infinite ease-in-out;
        }
        .animate-orb-pulse-outer {
          animation: orb-pulse-outer 1.5s infinite ease-in-out 0.2s;
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  if (!isActive) return null;

  const dynamicSize = { width: `${size}px`, height: `${size}px` };

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={dynamicSize}>
      <span className="sr-only">AI is speaking</span>
      {/* Outer subtle pulse */}
      <div 
        className="absolute bg-primary rounded-full animate-orb-pulse-outer"
        style={{ ...dynamicSize, filter: 'blur(3px)' }} 
      />
      {/* Inner main pulse */}
      <div 
        className="absolute bg-primary rounded-full animate-orb-pulse"
        style={dynamicSize}
      />
       {/* Small bright core */}
       <div 
        className="absolute bg-on-primary rounded-full"
        style={{ width: `${size * 0.3}px`, height: `${size * 0.3}px`, opacity: 0.8 }}
      />
    </div>
  );
};

export default SpeakingIndicator;
