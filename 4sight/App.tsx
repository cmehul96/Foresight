import React, { useState, useEffect, useCallback, useId } from 'react';
import { AppStep, CompanyBackground, ResearchObjectives, EditableResearchPlan, ResearchPlan, ResearchReport, KeyQuestionnaireItem, InterviewTranscriptItem, LanguageCode, LANGUAGE_OPTIONS } from './types';
import { fetchCompanyBackground, generateResearchPlan, generateResearchReport, resetAiClientState } from './services/geminiService';
import { APP_NAME, APP_TAGLINE, Icons, STEP_DESCRIPTIONS } from './constants';

import Navbar from './components/layout/Navbar';
import PageContainer from './components/layout/PageContainer';
import Button from './components/common/Button';
import TextInput from './components/common/TextInput';
import TextArea from './components/common/TextArea';
import LoadingSpinner from './components/common/LoadingSpinner';
import GradientText from './components/common/GradientText';
import StepIndicator from './components/foresight/StepIndicator';
import BentoCard from './components/foresight/BentoCard';
import EditableSection from './components/foresight/EditableSection';
import InterviewScreen from './components/foresight/InterviewScreen';
// import QuestionnaireDisplay from './components/foresight/QuestionnaireDisplay'; // Now used within EditableSection

const ALL_APP_STEPS_ORDERED: AppStep[] = [
  AppStep.WELCOME,
  AppStep.COMPANY_BACKGROUND_LOADING,
  AppStep.COMPANY_BACKGROUND_DISPLAY,
  AppStep.RESEARCH_DEFINITION_OBJECTIVES,
  AppStep.RESEARCH_DEFINITION_AUDIENCE,
  AppStep.RESEARCH_DEFINITION_ASSUMPTIONS,
  AppStep.RESEARCH_PLAN_GENERATING,
  AppStep.RESEARCH_PLAN_DISPLAY_EDIT,
  AppStep.INTERVIEW_PREPARATION,
  AppStep.INTERVIEW_SESSION,
  AppStep.REPORT_GENERATING,
  AppStep.REPORT_DISPLAY,
  AppStep.DASHBOARD_SUMMARY,
];

const DISPLAYABLE_STEPS_FOR_INDICATOR: AppStep[] = [
  AppStep.COMPANY_BACKGROUND_DISPLAY,
  AppStep.RESEARCH_DEFINITION_OBJECTIVES,
  AppStep.RESEARCH_DEFINITION_AUDIENCE,
  AppStep.RESEARCH_DEFINITION_ASSUMPTIONS,
  AppStep.RESEARCH_PLAN_DISPLAY_EDIT,
  AppStep.INTERVIEW_PREPARATION,
  AppStep.INTERVIEW_SESSION,
  AppStep.REPORT_DISPLAY,
  AppStep.DASHBOARD_SUMMARY,
];


const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.WELCOME);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyBackground, setCompanyBackground] = useState<CompanyBackground | null>(null);
  const [researchObjectives, setResearchObjectives] = useState<ResearchObjectives>({
    mainObjectives: '', targetAudience: '', assumptions: ''
  });
  const [researchPlan, setResearchPlan] = useState<EditableResearchPlan | null>(null);
  const [interviewTranscript, setInterviewTranscript] = useState<InterviewTranscriptItem[] | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en-US');
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const errorToastId = useId();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const resetApp = useCallback(() => {
    resetAiClientState(); // Clear cached AI client and error state
    setCurrentStep(AppStep.WELCOME);
    setCompanyName(''); // Explicitly reset to an empty string
    setCompanyBackground(null);
    setResearchObjectives({ mainObjectives: '', targetAudience: '', assumptions: '' });
    setResearchPlan(null);
    setInterviewTranscript(null);
    setResearchReport(null);
    setSelectedLanguage('en-US');
    setError(null);
    setIsLoading(false);
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleFetchCompanyBackground = useCallback(async () => {
    // --- DIAGNOSTIC LOGS ---
    console.log("handleFetchCompanyBackground called.");
    console.log("Current companyName value:", companyName);
    console.log("Type of companyName:", typeof companyName);
    // --- END DIAGNOSTIC LOGS ---

    // This check is the most robust way to ensure companyName is a string before trimming
    if (typeof companyName !== 'string' || companyName.trim() === '') {
      setError("Please enter a company name.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setCurrentStep(AppStep.COMPANY_BACKGROUND_LOADING);
    try {
      const background = await fetchCompanyBackground(companyName);
      if (background) {
        setCompanyBackground(background);
        setCurrentStep(AppStep.COMPANY_BACKGROUND_DISPLAY);
      } else {
        setError("Could not fetch company background. The response was empty or invalid.");
        setCurrentStep(AppStep.WELCOME);
      }
    } catch (err: any) {
      console.error("Error fetching company background:", err);
      let errorMessage = `Failed to analyze company: ${err.message || 'Unknown error'}`;
      if (err.message && (err.message.toLowerCase().includes("api key not valid") || err.message.includes("API_KEY_INVALID"))) {
        errorMessage = "Failed to analyze company: The pre-configured API key is invalid, expired, or missing required permissions. Please check the application's API key configuration and ensure it's correctly set up in the environment.";
      } else if (err.message && err.message.includes("VITE_GEMINI_API_KEY environment variable is not set")) {
        errorMessage = "Failed to analyze company: The API key is not configured for the application. Please ensure the API key is set up in the environment.";
      }
      setError(errorMessage);
      setCurrentStep(AppStep.WELCOME);
    } finally {
      setIsLoading(false);
    }
  }, [companyName]); // companyName is correctly in dependency array

  const handleUpdateCompanyBackgroundSection = useCallback((section: keyof CompanyBackground, value: string | string[]) => {
    setCompanyBackground(prev => prev ? { ...prev, [section]: value } : null);
  }, []);

  const handleGenerateResearchPlan = useCallback(async () => {
    if (!companyBackground) {
      setError("Company background is missing.");
      return;
    }
    if (!researchObjectives.mainObjectives.trim() || !researchObjectives.targetAudience.trim()) {
      setError("Main objectives and target audience are required.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setCurrentStep(AppStep.RESEARCH_PLAN_GENERATING);
    try {
      const plan = await generateResearchPlan(companyBackground, researchObjectives);
      if (plan) {
        setResearchPlan(plan as EditableResearchPlan);
        setCurrentStep(AppStep.RESEARCH_PLAN_DISPLAY_EDIT);
      } else {
        setError("Could not generate research plan. The response was empty or invalid.");
        setCurrentStep(AppStep.RESEARCH_DEFINITION_ASSUMPTIONS);
      }
    } catch (err: any) {
      console.error("Error generating research plan:", err);
       let errorMessage = `Failed to generate research plan: ${err.message || 'Unknown error'}`;
       if (err.message && (err.message.toLowerCase().includes("api key not valid") || err.message.includes("API_KEY_INVALID"))) {
        errorMessage = "Failed to generate plan: The pre-configured API key is invalid. Please check the API key configuration.";
      }
      setError(errorMessage);
      setCurrentStep(AppStep.RESEARCH_DEFINITION_ASSUMPTIONS);
    } finally {
      setIsLoading(false);
    }
  }, [companyBackground, researchObjectives]);

  const handleUpdateResearchPlanSection = useCallback((section: keyof ResearchPlan, value: any) => {
    setResearchPlan(prev => prev ? { ...prev, [section]: value } : null);
  }, []);

  const startInterviewProcess = useCallback(() => {
    if (!researchPlan) {
      setError("Research plan is missing. Cannot start interview.");
      return;
    }
     if (!researchPlan.keyQuestionnaire || researchPlan.keyQuestionnaire.length === 0 || researchPlan.keyQuestionnaire.every(theme => theme.questions.length === 0)) {
      setError("Research plan has no questions. Please edit the plan to add questions before starting the interview.");
      return;
    }
    setError(null);
    setCurrentStep(AppStep.INTERVIEW_PREPARATION);
  }, [researchPlan]);


  const handleInterviewConcluded = useCallback(async (transcript: InterviewTranscriptItem[]) => {
    setInterviewTranscript(transcript);
    if (!researchPlan) {
      setError("Research plan is missing. Cannot generate report.");
      setCurrentStep(AppStep.RESEARCH_PLAN_DISPLAY_EDIT);
      return;
    }

    setError(null);
    setIsLoading(true);
    setCurrentStep(AppStep.REPORT_GENERATING);
    try {
      const report = await generateResearchReport(researchPlan, transcript);
      if (report) {
        setResearchReport(report);
        setCurrentStep(AppStep.REPORT_DISPLAY);
      } else {
        setError("Could not generate research report from interview. The response was empty or invalid.");
        setCurrentStep(AppStep.INTERVIEW_SESSION);
      }
    } catch (err: any) {
      console.error("Error generating report from interview:", err);
      let errorMessage = `Failed to generate report: ${err.message || 'Unknown error'}`;
      if (err.message && (err.message.toLowerCase().includes("api key not valid") || err.message.includes("API_KEY_INVALID"))) {
        errorMessage = "Failed to generate report: The pre-configured API key is invalid. Please check the API key configuration.";
      }
      setError(errorMessage);
      setCurrentStep(AppStep.INTERVIEW_SESSION);
    } finally {
      setIsLoading(false);
    }
  }, [researchPlan]);

    useEffect(() => {
        return () => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, [currentStep]);


  const renderNavigationButtons = (
    backAction?: () => void,
    nextAction?: () => void,
    nextLabel = "Next",
    backLabel = "Back",
    nextIcon = <Icons.ChevronRight />, // Default size will be applied by Button component
    backIcon = <Icons.ChevronLeft />,  // Default size will be applied by Button component
    nextDisabled = false,
    nextButtonType: 'button' | 'submit' = 'button',
    nextButtonVariant: 'filled' | 'tonal' = 'filled'
  ) => (
    <div className="mt-10 flex justify-between items-center">
      {backAction ? (
        <Button variant="outlined" onClick={backAction} leftIcon={backIcon} size="md" disabled={isLoading}>
          {backLabel}
        </Button>
      ) : <div />}
      {nextAction && (
        <Button
          variant={nextButtonVariant}
          onClick={nextAction}
          rightIcon={nextIcon}
          size="md"
          disabled={nextDisabled || isLoading}
          type={nextButtonType}
        >
          {nextLabel}
        </Button>
      )}
    </div>
  );

  const renderContent = () => {
    return (
      <PageContainer>
        {currentStep === AppStep.WELCOME && (
          <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-10rem)] px-4">
            <Icons.Eye className="text-6xl text-primary animate-pulse-fast mb-4" />
            <GradientText
                className="text-6xl font-bold mb-3"
                from="from-indigo-500"
                via="via-purple-500"
                to="to-fuchsia-500"
            >
                {APP_NAME}
            </GradientText>
            <p className="text-xl text-on-surface-variant mb-10">{APP_TAGLINE}</p>
            <div className="w-full max-w-md space-y-6">
              <TextInput
                label="Enter Company Name to Analyze"
                value={companyName}
                onChange={(e) => {
                  console.log("TextInput onChange:", e.target.value, typeof e.target.value); // Diagnostic log
                  setCompanyName(e.target.value);
                }}
                onKeyDown={(e) => {
                  console.log("TextInput onKeyDown - companyName:", companyName, typeof companyName); // Diagnostic log
                  if (e.key === 'Enter' && !isLoading && companyName && companyName.trim() !== '') {
                    handleFetchCompanyBackground();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  console.log("Button onClick - companyName:", companyName, typeof companyName); // Diagnostic log
                  handleFetchCompanyBackground();
                }}
                rightIcon={<Icons.MagicSparkle className="text-xl"/>}
                disabled={isLoading || !companyName || companyName.trim() === ''}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Company & Get Started'}
              </Button>
            </div>
          </div>
        )}

        {currentStep === AppStep.COMPANY_BACKGROUND_LOADING && (
          <LoadingSpinner text="Analyzing company background..." size="lg" className="py-20" />
        )}

        {currentStep === AppStep.COMPANY_BACKGROUND_DISPLAY && companyBackground && (
          <PageContainer title={`Background: ${companyName}`}>
            <p className="text-center text-on-surface-variant mb-8">Review and edit the AI-generated company background. Ensure all details are concise and accurate for the research plan.</p>
            <div className="space-y-6">
              <EditableSection title="Industry" initialValue={companyBackground.industry} fieldType="text" onSave={(v) => handleUpdateCompanyBackgroundSection('industry', v)} icon={<Icons.Industry />} className="md:col-span-3"/>
              <EditableSection title="Mission/Vision" initialValue={companyBackground.missionVision} fieldType="textarea" onSave={(v) => handleUpdateCompanyBackgroundSection('missionVision', v)} icon={<Icons.MissionVision />} className="md:col-span-3"/>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <EditableSection title="Products/Services" initialValue={companyBackground.productsServices} fieldType="string-array" onSave={(v) => handleUpdateCompanyBackgroundSection('productsServices', v)} icon={<Icons.ProductsServices />} />
                 <EditableSection title="Target Markets" initialValue={companyBackground.targetMarkets} fieldType="string-array" onSave={(v) => handleUpdateCompanyBackgroundSection('targetMarkets', v)} icon={<Icons.TargetMarkets />} />
                 <EditableSection title="Key Competitors" initialValue={companyBackground.competitors} fieldType="string-array" onSave={(v) => handleUpdateCompanyBackgroundSection('competitors', v)} icon={<Icons.Competitors />} />
              </div>
            </div>
            {renderNavigationButtons(
              () => setCurrentStep(AppStep.WELCOME),
              () => setCurrentStep(AppStep.RESEARCH_DEFINITION_OBJECTIVES)
            )}
          </PageContainer>
        )}
        {currentStep === AppStep.COMPANY_BACKGROUND_DISPLAY && !companyBackground && (
          <PageContainer title="Error"><p>Company background not available.</p>{renderNavigationButtons(resetApp)}</PageContainer>
        )}

        {currentStep === AppStep.RESEARCH_DEFINITION_OBJECTIVES && (
          <PageContainer title="Define Research Objectives">
            <p className="text-center text-on-surface-variant mb-6">Clearly state what you want to achieve with this research.</p>
            <TextArea
              label="Main Research Objectives"
              value={researchObjectives.mainObjectives}
              onChange={(e) => setResearchObjectives(prev => ({...prev, mainObjectives: e.target.value}))}
              rows={6}
              placeholder="e.g., Understand user needs for a new feature, identify pain points in onboarding."
            />
            {renderNavigationButtons(
              () => setCurrentStep(AppStep.COMPANY_BACKGROUND_DISPLAY),
              () => setCurrentStep(AppStep.RESEARCH_DEFINITION_AUDIENCE),
              "Next", "Back", <Icons.ChevronRight/>, <Icons.ChevronLeft/>,
              !researchObjectives.mainObjectives.trim()
            )}
          </PageContainer>
        )}

        {currentStep === AppStep.RESEARCH_DEFINITION_AUDIENCE && (
          <PageContainer title="Define Target Audience">
             <p className="text-center text-on-surface-variant mb-6">Specify who you will be researching.</p>
            <TextArea
              label="Target Audience for this Research"
              value={researchObjectives.targetAudience}
              onChange={(e) => setResearchObjectives(prev => ({...prev, targetAudience: e.target.value}))}
              rows={6}
              placeholder="e.g., Existing premium subscribers, potential new users aged 25-40."
            />
            {renderNavigationButtons(
              () => setCurrentStep(AppStep.RESEARCH_DEFINITION_OBJECTIVES),
              () => setCurrentStep(AppStep.RESEARCH_DEFINITION_ASSUMPTIONS),
              "Next", "Back", <Icons.ChevronRight/>, <Icons.ChevronLeft/>,
              !researchObjectives.targetAudience.trim()
            )}
          </PageContainer>
        )}

        {currentStep === AppStep.RESEARCH_DEFINITION_ASSUMPTIONS && (
          <PageContainer title="Define Assumptions (Optional)">
            <p className="text-center text-on-surface-variant mb-6">List any underlying assumptions your research aims to test.</p>
            <TextArea
              label="Key Assumptions to Test or Validate"
              value={researchObjectives.assumptions || ''}
              onChange={(e) => setResearchObjectives(prev => ({...prev, assumptions: e.target.value}))}
              rows={6}
              placeholder="e.g., Users are willing to pay for X feature, the current UI is intuitive."
            />
            {renderNavigationButtons(
              () => setCurrentStep(AppStep.RESEARCH_DEFINITION_AUDIENCE),
              handleGenerateResearchPlan,
              "Generate Research Plan", "Back", <Icons.AIInsight />, <Icons.ChevronLeft/>,
              isLoading || !researchObjectives.mainObjectives.trim() || !researchObjectives.targetAudience.trim()
            )}
          </PageContainer>
        )}

        {currentStep === AppStep.RESEARCH_PLAN_GENERATING && (
          <LoadingSpinner text="Crafting your research plan..." size="lg" className="py-20" />
        )}

        {currentStep === AppStep.RESEARCH_PLAN_DISPLAY_EDIT && researchPlan && (
          <PageContainer title="Review Your Research Plan">
             <p className="text-center text-on-surface-variant mb-8">This is the AI-generated research plan. Review and edit sections as needed. This plan will guide the interview. Ensure it's concise and focused.</p>
            <div className="space-y-6">
              <EditableSection title="Research Methods" initialValue={researchPlan.researchMethods} fieldType="string-array" onSave={(v) => handleUpdateResearchPlanSection('researchMethods', v)} icon={<Icons.ClipboardList />} />
              <EditableSection title="Key Questionnaire / Discussion Guide" initialValue={researchPlan.keyQuestionnaire} fieldType="theme-questions-array" onSave={(v) => handleUpdateResearchPlanSection('keyQuestionnaire', v)} icon={<Icons.LightBulb />} />
              <EditableSection title="Guardrails & Probes" initialValue={researchPlan.guardrailsProbes} fieldType="string-array" onSave={(v) => handleUpdateResearchPlanSection('guardrailsProbes', v)} icon={<Icons.ShieldCheck />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EditableSection title="Estimated Participants" initialValue={researchPlan.estimatedParticipants} fieldType="number" onSave={(v) => handleUpdateResearchPlanSection('estimatedParticipants', v)} icon={<Icons.TargetMarkets />} />
                <EditableSection title="Timeline Suggestion" initialValue={researchPlan.timelineSuggestion} fieldType="text" onSave={(v) => handleUpdateResearchPlanSection('timelineSuggestion', v)} icon={<Icons.ArrowPath />} />
              </div>
              <EditableSection title="Participant Recruitment Criteria" initialValue={researchPlan.participantRecruitmentCriteria} fieldType="string-array" onSave={(v) => handleUpdateResearchPlanSection('participantRecruitmentCriteria', v)} icon={<Icons.Eye />} />
              <EditableSection title="Ethical Considerations" initialValue={researchPlan.ethicalConsiderations} fieldType="string-array" onSave={(v) => handleUpdateResearchPlanSection('ethicalConsiderations', v)} icon={<Icons.ShieldCheck />} />
            </div>
            {renderNavigationButtons(
              () => setCurrentStep(AppStep.RESEARCH_DEFINITION_ASSUMPTIONS),
              startInterviewProcess,
              "Finalize Plan & Setup Interview", "Back to Definitions", <Icons.Microphone />, <Icons.ChevronLeft/>, isLoading
            )}
          </PageContainer>
        )}
        {currentStep === AppStep.RESEARCH_PLAN_DISPLAY_EDIT && !researchPlan && (
          <PageContainer title="Error"><p>Research plan not available.</p>{renderNavigationButtons(() => setCurrentStep(AppStep.RESEARCH_DEFINITION_ASSUMPTIONS))}</PageContainer>
        )}

        {currentStep === AppStep.INTERVIEW_PREPARATION && (
          <PageContainer title="Interview Setup">
            <div className="text-center space-y-8 bg-surface-container/60 backdrop-blur-md border border-white/5 p-8 rounded-2xl shadow-lg max-w-2xl mx-auto">
              <div className="flex items-center justify-center">
                <Icons.Translate className="text-4xl text-primary mr-3" />
                 <h2 className="text-2xl font-semibold text-on-surface">Select Interview Language</h2>
              </div>

              <fieldset className="space-y-3">
                <legend className="sr-only">Interview Language</legend>
                {(Object.keys(LANGUAGE_OPTIONS) as LanguageCode[]).map((langCode) => (
                  <label key={langCode} htmlFor={`lang-${langCode}`} className={`
                    flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors
                    bg-surface-variant/70 backdrop-blur-sm hover:border-primary-container/70
                    ${selectedLanguage === langCode ? 'bg-primary-container/80 border-primary ring-2 ring-primary backdrop-blur-md' : 'border-outline/50'}
                  `}>
                    <input
                      type="radio"
                      id={`lang-${langCode}`}
                      name="interviewLanguage"
                      value={langCode}
                      checked={selectedLanguage === langCode}
                      onChange={() => setSelectedLanguage(langCode)}
                      className="form-radio h-5 w-5 text-primary focus:ring-primary-focus mr-3"
                    />
                    <span className={`text-lg font-medium ${selectedLanguage === langCode ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
                      {LANGUAGE_OPTIONS[langCode]}
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="mt-6 border-t border-outline-variant/50 pt-6">
                 <Icons.Microphone className="text-5xl text-primary mx-auto mb-2" />
                <h2 className="text-xl font-semibold text-on-surface mb-2">Get Ready!</h2>
                <p className="text-on-surface-variant">
                  The AI research agent will ask questions based on your research plan in the selected language.
                  The agent's questions will be spoken aloud. You can type or speak your responses.
                </p>
                <p className="text-on-surface-variant font-medium mt-2">
                  Ensure your microphone is enabled if you plan to use voice input.
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => setCurrentStep(AppStep.INTERVIEW_SESSION)}
                rightIcon={<Icons.ChevronRight />}
                className="mt-6"
              >
                Start Interview Session
              </Button>
            </div>
            {renderNavigationButtons(() => setCurrentStep(AppStep.RESEARCH_PLAN_DISPLAY_EDIT))}
          </PageContainer>
        )}

        {currentStep === AppStep.INTERVIEW_SESSION && researchPlan && (
          <InterviewScreen
            researchPlan={researchPlan}
            companyName={companyName || "the company"}
            selectedLanguage={selectedLanguage}
            onInterviewComplete={handleInterviewConcluded}
            onCancel={() => {
                if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
                setCurrentStep(AppStep.INTERVIEW_PREPARATION);
            }}
            onError={(errorMessage) => setError(errorMessage)}
          />
        )}
        {currentStep === AppStep.INTERVIEW_SESSION && !researchPlan && (
          <PageContainer title="Error"><p>Research plan not found.</p>{renderNavigationButtons(() => setCurrentStep(AppStep.RESEARCH_PLAN_DISPLAY_EDIT))}</PageContainer>
        )}

        {currentStep === AppStep.REPORT_GENERATING && (
          <LoadingSpinner text="Synthesizing interview insights and generating your report..." size="lg" className="py-20" />
        )}

        {currentStep === AppStep.REPORT_DISPLAY && researchReport && (
          <PageContainer title="Research Report">
             <p className="text-center text-on-surface-variant mb-8">This report is generated based on the interview transcript and your research plan.</p>
            <div className="space-y-6">
              <BentoCard cardTitle="Executive Summary" icon={<Icons.ClipboardList />}>
                <p className="whitespace-pre-wrap">{researchReport.executiveSummary}</p>
              </BentoCard>
              <BentoCard cardTitle="Key Findings" icon={<Icons.AIInsight />}>
                <ul className="space-y-2">
                  {researchReport.keyFindings.map((finding, i) => (
                    <li key={i} className="flex items-start p-2 bg-surface-container-low/50 backdrop-blur-sm rounded-md">
                      <span className="text-primary mr-2 mt-1">&#9679;</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </BentoCard>
              <BentoCard cardTitle="Identified Themes" icon={<Icons.LightBulb />}>
                <div className="space-y-4">
                  {researchReport.identifiedThemes.map((theme, i) => (
                    <div key={i} className="p-4 bg-surface-container/60 backdrop-blur-md rounded-xl shadow border border-white/5">
                      <h4 className="text-lg font-semibold text-primary-container mb-1">{theme.theme}</h4>
                      <p className="text-sm text-on-surface whitespace-pre-wrap">{theme.description}</p>
                    </div>
                  ))}
                </div>
              </BentoCard>
              <BentoCard cardTitle="Illustrative Quotes" icon={<Icons.Quotation />}>
                 <div className="space-y-4">
                  {researchReport.illustrativeQuotes.map((quote, i) => (
                    <blockquote key={i} className="border-l-4 border-secondary pl-4 py-2 italic bg-surface-container-low/60 backdrop-blur-md rounded-r-md shadow">
                      <p className="text-on-surface-variant">"{quote.quote}"</p>
                      <cite className="block text-right text-sm not-italic mt-2 text-on-surface-variant/80">- {quote.attribution}</cite>
                    </blockquote>
                  ))}
                </div>
              </BentoCard>
              <BentoCard cardTitle="Recommendations" icon={<Icons.CheckCircle />}>
                <ul className="space-y-2">
                  {researchReport.recommendations.map((rec, i) => (
                     <li key={i} className="flex items-start p-2 bg-surface-container-low/50 backdrop-blur-sm rounded-md">
                      <span className="text-secondary mr-2 mt-1">&#10148;</span>
                       <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </BentoCard>
            </div>
             {renderNavigationButtons(
              () => setCurrentStep(AppStep.INTERVIEW_SESSION),
              () => setCurrentStep(AppStep.DASHBOARD_SUMMARY),
              "View Project Summary", "Back to Interview", <Icons.ChartBar/>
            )}
          </PageContainer>
        )}
        {currentStep === AppStep.REPORT_DISPLAY && !researchReport && (
          <PageContainer title="Error"><p>Research report not available.</p>{renderNavigationButtons(() => setCurrentStep(AppStep.INTERVIEW_SESSION))}</PageContainer>
        )}

        {currentStep === AppStep.DASHBOARD_SUMMARY && (
          <PageContainer title="Project Complete!">
            <div className="flex flex-col items-center text-center py-10 bg-surface-container/60 backdrop-blur-md border border-white/5 p-8 rounded-3xl shadow-lg">
              <Icons.CheckCircle className="text-5xl text-primary-container mb-6" />
              <h2 className="text-2xl font-semibold mb-3">Congratulations!</h2>
              <p className="text-lg text-on-surface-variant mb-6">
                Your research project for <GradientText from="from-indigo-500" via="via-purple-500" to="to-fuchsia-500" className="font-semibold">{companyName}</GradientText> is complete.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mt-6">
                {researchPlan && <Button variant="tonal" onClick={() => setCurrentStep(AppStep.RESEARCH_PLAN_DISPLAY_EDIT)} leftIcon={<Icons.ClipboardList/>}>
                  View Research Plan
                </Button>}
                {researchReport && <Button variant="tonal" onClick={() => setCurrentStep(AppStep.REPORT_DISPLAY)} leftIcon={<Icons.ChartBar/>}>
                  View Final Report
                </Button>}
                 {interviewTranscript && interviewTranscript.length > 0 && <Button variant="tonal" onClick={() => setCurrentStep(AppStep.INTERVIEW_SESSION)} leftIcon={<Icons.Microphone />}>
                  Review Interview Log
                </Button>}
              </div>
              <Button
                variant="filled"
                onClick={resetApp}
                className="mt-10"
                size="lg"
                leftIcon={<Icons.ArrowPath />}
              >
                Start New Research Project
              </Button>
            </div>
          </PageContainer>
        )}

        {currentStep === AppStep.DASHBOARD_SUMMARY && !companyName && !researchPlan && !researchReport && ( // Fallback if no data available, though unlikely
          <PageContainer title="Error">
            <p>An unexpected error occurred or you've reached an unknown step. Current step: {AppStep[currentStep]}</p>
            <Button onClick={resetApp} className="mt-4">Start Over</Button>
          </PageContainer>
        )}
      </PageContainer>
    );
  };

  const showStepIndicator = ![
      AppStep.WELCOME,
      AppStep.COMPANY_BACKGROUND_LOADING,
      AppStep.RESEARCH_PLAN_GENERATING,
      AppStep.REPORT_GENERATING,
    ].includes(currentStep);

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background">
      <Navbar />
      {error && (
        <div
          key={errorToastId}
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] p-4 rounded-lg shadow-xl bg-error-container/80 backdrop-blur-md border border-on-error-container/30 text-on-error-container max-w-md w-full text-center animate-pulse-fast"
        >
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      <main className="flex-grow">
        {showStepIndicator && (
          <PageContainer className="pt-8 pb-0 md:pt-4 md:pb-0">
             <StepIndicator
                currentStep={currentStep}
                allAppStepsOrdered={ALL_APP_STEPS_ORDERED}
                displayableSteps={DISPLAYABLE_STEPS_FOR_INDICATOR}
            />
          </PageContainer>
        )}
        {renderContent()}
      </main>
      <footer className="py-6 text-center text-sm text-on-surface-variant border-t border-outline-variant/30 bg-surface/50 backdrop-blur-sm">
        &copy; {new Date().getFullYear()} {APP_NAME}. AI Research Partner.
      </footer>
    </div>
  );
};

export default App;
