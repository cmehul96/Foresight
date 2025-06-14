
import React from 'react';
import { InterviewStage } from '../../types'; // Assuming InterviewStage might be used for expressions later

interface AIAgentAvatarProps {
  className?: string;
  stage?: InterviewStage; // For future expression changes
  size?: number; // Diameter in pixels
}

const AIAgentAvatar: React.FC<AIAgentAvatarProps> = ({ className = '', stage, size = 40 }) => {
  // Base Color on primary theme
  const primaryColor = 'var(--md-sys-color-primary)';
  const onPrimaryColor = 'var(--md-sys-color-on-primary)';
  const surfaceColor = 'var(--md-sys-color-surface-container-high)';

  // Could add more dynamic expressions based on 'stage' later
  // For now, a friendly static face

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill={surfaceColor} stroke={primaryColor} strokeWidth="3" />
        
        {/* Eyes */}
        <circle cx="35" cy="40" r="8" fill={primaryColor} />
        <circle cx="65" cy="40" r="8" fill={primaryColor} />
        
        {/* Pupils (optional, can make it look more focused) */}
        <circle cx="37" cy="40" r="3" fill={onPrimaryColor} />
        <circle cx="63" cy="40" r="3" fill={onPrimaryColor} />

        {/* Mouth (simple smile) */}
        <path d="M 30 65 Q 50 75 70 65" stroke={primaryColor} strokeWidth="5" fill="none" strokeLinecap="round"/>

        {/* Optional: A subtle highlight or glow if stage is 'asking' or 'concluding' */}
        {(stage === 'asking' || stage === 'concluding') && (
            <circle cx="50" cy="50" r="48" fill="none" stroke={primaryColor} strokeWidth="4" strokeOpacity="0.5">
                 <animate attributeName="stroke-width" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
                 <animate attributeName="stroke-opacity" values="0.5;0.8;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
        )}
      </svg>
    </div>
  );
};

export default AIAgentAvatar;
