import React from 'react';
import { KeyQuestionnaireItem } from '../../types';

interface QuestionnaireDisplayProps {
  questionnaire: KeyQuestionnaireItem[];
}

const QuestionnaireDisplay: React.FC<QuestionnaireDisplayProps> = ({ questionnaire }) => {
  if (!questionnaire || questionnaire.length === 0) {
    return <p className="italic text-on-surface-variant/70">No themes or questions defined.</p>;
  }

  return (
    <div className="space-y-6">
      {questionnaire.map((item, index) => (
        <div key={index} className="p-4 bg-surface-container rounded-xl shadow">
          <h4 className="text-lg font-semibold text-primary mb-2">{item.theme || 'Untitled Theme'}</h4>
          {Array.isArray(item.questions) && item.questions.length > 0 ? (
            <ul className="space-y-1 pl-5">
              {item.questions.map((q, qIndex) => (
                <li key={qIndex} className="text-on-surface-variant list-disc">
                  {q}
                </li>
              ))}
            </ul>
          ) : (
            <p className="italic text-sm text-on-surface-variant/70 ml-1">No questions for this theme.</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuestionnaireDisplay;
