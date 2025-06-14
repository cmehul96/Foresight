
import React from 'react';
import { AppStep } from '../../types';
import { STEP_DESCRIPTIONS, Icons } from '../../constants';

interface StepIndicatorProps {
  currentStep: AppStep;
  allAppStepsOrdered: AppStep[];
  displayableSteps: AppStep[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, allAppStepsOrdered, displayableSteps }) => {
  
  const getEffectiveDisplayIndex = () => {
    const currentDisplayableIndex = displayableSteps.indexOf(currentStep);
    if (currentDisplayableIndex !== -1) {
      return currentDisplayableIndex;
    }

    // Handle loading/transient steps
    let logicalCurrentIndex = allAppStepsOrdered.indexOf(currentStep);
    if (logicalCurrentIndex === -1) return 0; // Default to first step if currentStep is unknown

    // Find the next displayable step in logical order
    for (let i = logicalCurrentIndex + 1; i < allAppStepsOrdered.length; i++) {
      const nextDisplayableIndex = displayableSteps.indexOf(allAppStepsOrdered[i]);
      if (nextDisplayableIndex !== -1) {
        return nextDisplayableIndex;
      }
    }
    
    // If no next, try previous (e.g. if loading is the last logical step before a displayable one)
     for (let i = logicalCurrentIndex -1; i >= 0; i--) {
      const prevDisplayableIndex = displayableSteps.indexOf(allAppStepsOrdered[i]);
      if (prevDisplayableIndex !== -1) {
        return prevDisplayableIndex; 
      }
    }
    // Default or if at the end of displayable steps
    const lastDisplayableStepIndex = displayableSteps.length -1;
    if (logicalCurrentIndex >= allAppStepsOrdered.indexOf(displayableSteps[lastDisplayableStepIndex])) {
        return lastDisplayableStepIndex;
    }

    return 0; // Fallback
  };

  const effectiveCurrentDisplayIndex = getEffectiveDisplayIndex();

  return (
    <div className="mb-12">
      <ol className="flex items-start justify-center space-x-2 sm:space-x-4">
        {displayableSteps.map((step, index) => {
          const isCompleted = index < effectiveCurrentDisplayIndex;
          const isCurrent = index === effectiveCurrentDisplayIndex;
          const stepDescription = STEP_DESCRIPTIONS[step] || "Unknown Step";

          return (
            <li key={step} className="flex flex-col items-center text-center max-w-[100px] sm:max-w-[120px]">
              <div className={`
                flex items-center justify-center 
                w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-medium
                ${isCompleted ? 'bg-primary-container text-on-primary-container' : ''}
                ${isCurrent ? 'bg-primary text-on-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                ${!isCompleted && !isCurrent ? 'border-2 border-outline text-on-surface-variant' : ''}
              `}>
                {isCompleted ? <Icons.CheckCircle className="text-xl sm:text-2xl" /> : index + 1} {/* Adjusted for Material Symbols */}
              </div>
              <span className={`
                mt-2 text-xs sm:text-sm font-medium break-words
                ${isCompleted ? 'text-on-primary-container' : ''}
                ${isCurrent ? 'text-primary' : ''}
                ${!isCompleted && !isCurrent ? 'text-on-surface-variant' : ''}
              `}>
                {stepDescription}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default StepIndicator;
