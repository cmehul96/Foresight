
import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  titleClassName?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  className = '',
  titleClassName = ''
}) => {
  return (
    <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {title && (
        <h1 className={`text-3xl font-bold text-on-surface mb-8 text-center ${titleClassName}`}>
          {title}
        </h1>
      )}
      {children}
    </div>
  );
};

export default PageContainer;
