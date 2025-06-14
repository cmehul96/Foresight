import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import TextInput from '../common/TextInput';
import TextArea from '../common/TextArea';
import BentoCard from './BentoCard';
import { Icons } from '../../constants';
import { KeyQuestionnaireItem } from '../../types';
import QuestionnaireDisplay from './QuestionnaireDisplay'; // Import the new component

type FieldType = 'text' | 'textarea' | 'number' | 'string-array' | 'theme-questions-array';

interface EditableSectionProps {
  title: string;
  initialValue: any;
  fieldType: FieldType;
  onSave: (value: any) => void;
  className?: string;
  isEditingDefault?: boolean;
  icon?: React.ReactNode;
}

const EditableSection: React.FC<EditableSectionProps> = ({
  title,
  initialValue,
  fieldType,
  onSave,
  className = '',
  isEditingDefault = false,
  icon,
}) => {
  const [isEditing, setIsEditing] = useState(isEditingDefault);
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [inputValue, setInputValue] = useState(''); // For text-based inputs

  useEffect(() => {
    setCurrentValue(initialValue);
    if (fieldType === 'string-array') {
      setInputValue(Array.isArray(initialValue) ? initialValue.join('\n') : '');
    } else if (fieldType === 'theme-questions-array') {
      try {
        setInputValue(JSON.stringify(initialValue || [], null, 2));
      } catch {
        setInputValue("[]");
      }
    } else {
      setInputValue(String(initialValue ?? ''));
    }
  }, [initialValue, fieldType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'number') {
      setCurrentValue(fieldType === 'number' ? parseFloat(e.target.value) || 0 : e.target.value);
    }
  };
  
  const handleSave = () => {
    let valueToSave = currentValue;
    if (fieldType === 'string-array') {
      valueToSave = inputValue.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    } else if (fieldType === 'theme-questions-array') {
      try {
        const parsed = JSON.parse(inputValue);
        if(Array.isArray(parsed)) {
            valueToSave = parsed.map(item => ({
                theme: item.theme || "Untitled Theme",
                questions: Array.isArray(item.questions) ? item.questions.filter(q => typeof q === 'string') : []
            }));
        } else {
            valueToSave = []; // default to empty array if parse fails or not an array
        }
      } catch (error) {
        console.error("Error parsing theme-questions JSON:", error);
        // Potentially set an error state to show to user
        valueToSave = initialValue; // Revert to initial on parse error
      }
    }
    onSave(valueToSave);
    if (!isEditingDefault) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setCurrentValue(initialValue);
     if (fieldType === 'string-array') {
      setInputValue(Array.isArray(initialValue) ? initialValue.join('\n') : '');
    } else if (fieldType === 'theme-questions-array') {
      setInputValue(JSON.stringify(initialValue || [], null, 2));
    } else {
      setInputValue(String(initialValue ?? ''));
    }
    if (!isEditingDefault) {
      setIsEditing(false);
    }
  };

  const renderDisplayValue = () => {
    if (currentValue === null || currentValue === undefined || (typeof currentValue === 'string' && currentValue.trim() === '')) {
      return <p className="italic text-on-surface-variant/70">Not specified</p>;
    }
    switch (fieldType) {
      case 'string-array':
        return Array.isArray(currentValue) && currentValue.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentValue.map((item, index) => (
              <span key={index} className="bg-primary-container text-on-primary-container text-xs font-medium px-2.5 py-1 rounded-full">
                {item}
              </span>
            ))}
          </div>
        ) : <p className="italic text-on-surface-variant/70">No items defined</p>;
      case 'theme-questions-array':
        return Array.isArray(currentValue) && currentValue.length > 0 ? (
          <QuestionnaireDisplay questionnaire={currentValue as KeyQuestionnaireItem[]} />
        ) : <p className="italic text-on-surface-variant/70">No themes or questions defined</p>;
      default:
        // For text and textarea, render with whitespace preservation
        if (fieldType === 'textarea' && typeof currentValue === 'string') {
          return <p className="whitespace-pre-wrap">{currentValue}</p>;
        }
        return <p>{String(currentValue)}</p>;
    }
  };

  const actions = (
    <>
      {!isEditingDefault && !isEditing && (
        <Button variant="tonal" size="sm" onClick={() => setIsEditing(true)} leftIcon={<Icons.Edit />}>
          Edit
        </Button>
      )}
      {isEditing && (
        <>
          {!isEditingDefault && (
            <Button variant="text" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button variant="filled" size="sm" onClick={handleSave} leftIcon={<Icons.CheckCircle />}>
            {isEditingDefault ? 'Save Changes' : 'Save'}
          </Button>
        </>
      )}
    </>
  );

  return (
    <BentoCard cardTitle={title} icon={icon} actions={actions} className={className}>
      {isEditing ? (
        <div className="space-y-4">
          {fieldType === 'text' && <TextInput label={title} value={inputValue} onChange={handleInputChange} />}
          {fieldType === 'textarea' && <TextArea label={title} value={inputValue} onChange={handleInputChange} rows={5} />}
          {fieldType === 'number' && <TextInput type="number" label={title} value={inputValue} onChange={handleInputChange} />}
          {(fieldType === 'string-array') && (
            <TextArea label={`${title} (one item per line)`} value={inputValue} onChange={handleInputChange} rows={5} />
          )}
          {(fieldType === 'theme-questions-array') && (
             <div>
                <TextArea label={`${title} (edit as JSON)`} value={inputValue} onChange={handleInputChange} rows={10} />
                <p className="text-xs text-on-surface-variant mt-1">
                    Expected format: <code className="bg-surface-container p-0.5 rounded text-xs">{"[{ \"theme\": \"Name\", \"questions\": [\"Q1\", \"Q2\"] }]" }</code>
                </p>
             </div>
          )}
        </div>
      ) : (
        renderDisplayValue()
      )}
    </BentoCard>
  );
};

export default EditableSection;
