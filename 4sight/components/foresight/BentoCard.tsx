
import React from 'react';

interface BentoCardProps {
  cardTitle: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

const BentoCard: React.FC<BentoCardProps> = ({ cardTitle, children, className = '', icon, actions }) => {
  return (
    <div className={`bg-surface-variant/60 backdrop-blur-md border border-white/10 rounded-3xl shadow-lg p-6 flex flex-col ${className}`}>
      <div className="flex items-center mb-4">
        {icon && <span className="mr-3 text-primary">{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'text-2xl'})}</span>} {/* Adjusted for Material Symbols */}
        <h3 className="text-xl font-semibold text-on-surface-variant">{cardTitle}</h3>
      </div>
      <div className="flex-grow text-on-surface-variant prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
        {children}
      </div>
      {actions && (
        <div className="mt-6 flex justify-end space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default BentoCard;