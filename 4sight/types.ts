
export enum AppStep {
  WELCOME,
  COMPANY_BACKGROUND_INPUT, 
  COMPANY_BACKGROUND_LOADING,
  COMPANY_BACKGROUND_DISPLAY,
  RESEARCH_DEFINITION_OBJECTIVES,
  RESEARCH_DEFINITION_AUDIENCE,
  RESEARCH_DEFINITION_ASSUMPTIONS,
  RESEARCH_PLAN_GENERATING,
  RESEARCH_PLAN_DISPLAY_EDIT,
  INTERVIEW_PREPARATION,
  INTERVIEW_SESSION,
  REPORT_GENERATING,
  REPORT_DISPLAY,
  DASHBOARD_SUMMARY
}

export type LanguageCode = 'en-US' | 'en-IN' | 'hi-IN';

export const LANGUAGE_OPTIONS: Record<LanguageCode, string> = {
  'en-US': 'English (US)',
  'en-IN': 'English (India)',
  'hi-IN': 'Hindi (India)',
};


export interface CompanyBackground {
  industry: string;
  productsServices: string[];
  missionVision: string;
  targetMarkets: string[];
  competitors: string[];
}

export interface ResearchObjectives {
  mainObjectives: string;
  targetAudience: string;
  assumptions?: string;
}

export interface KeyQuestionnaireItem {
  theme: string;
  questions: string[];
}

export interface ResearchPlan {
  researchMethods: string[];
  keyQuestionnaire: KeyQuestionnaireItem[];
  guardrailsProbes: string[];
  estimatedParticipants: number;
  participantRecruitmentCriteria: string[];
  timelineSuggestion?: string;
  ethicalConsiderations?: string[];
}

export interface IllustrativeQuote {
  quote: string;
  attribution: string;
}

export interface IdentifiedTheme {
  theme: string;
  description: string;
}

export interface ResearchReport {
  executiveSummary: string;
  keyFindings: string[];
  identifiedThemes: IdentifiedTheme[];
  illustrativeQuotes: IllustrativeQuote[];
  recommendations: string[];
}

export interface EditableResearchPlan extends ResearchPlan {}

export interface InterviewTranscriptItem {
  speaker: 'AI' | 'User';
  theme?: string; 
  question?: string; 
  answer?: string; 
  text?: string; 
  isProbing?: boolean;
}

export interface AIQuestionResponse {
  nextQuestionText: string;
  theme: string;
  isProbing: boolean;
  isEndOfInterview: boolean;
}

export type InterviewStage = 'processing' | 'asking' | 'listening' | 'concluding' | 'finished';