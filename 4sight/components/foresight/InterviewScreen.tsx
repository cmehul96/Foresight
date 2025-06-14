import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResearchPlan, InterviewTranscriptItem, AIQuestionResponse, InterviewStage, LanguageCode, LANGUAGE_OPTIONS } from '../../types';
import { Icons } from '../../constants';
import Button from '../common/Button';
import TextArea from '../common/TextArea';
import PageContainer from '../layout/PageContainer';
import GradientText from '../common/GradientText';
import LoadingSpinner from '../common/LoadingSpinner';
import SpeakingIndicator from './SpeakingIndicator';
import { generateFollowUpQuestion, synthesizeSpeech, transcribeAudio } from '../../services/geminiService';

declare global {
  interface Window {
    MediaRecorder: typeof MediaRecorder;
    speechSynthesis: SpeechSynthesis;
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  interface BlobEvent extends Event {
    data: Blob;
  }
}

interface InterviewScreenProps {
  researchPlan: ResearchPlan;
  companyName: string;
  selectedLanguage: LanguageCode;
  onInterviewComplete: (transcript: InterviewTranscriptItem[]) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

const InterviewScreen: React.FC<InterviewScreenProps> = ({
  researchPlan,
  companyName,
  selectedLanguage,
  onInterviewComplete,
  onCancel,
  onError,
}) => {
  const [currentAIQuestion, setCurrentAIQuestion] = useState<Omit<AIQuestionResponse, 'isEndOfInterview'> | null>(null);
  const [displayedQuestionText, setDisplayedQuestionText] = useState('');
  const [currentUserResponse, setCurrentUserResponse] = useState('');
  const [transcript, setTranscript] = useState<InterviewTranscriptItem[]>([]);
  const [interviewStage, setInterviewStage] = useState<InterviewStage>('initial');
  const [isFetchingQuestion, setIsFetchingQuestion] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [voiceInputStage, setVoiceInputStage] = useState<'idle' | 'recording' | 'transcribing' | 'error' | 'readyToSubmit'>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speakingPromiseRef = useRef<Promise<void> | null>(null);
  const lastSpokenQuestionTextRef = useRef<string | null>(null);
  const submitDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const clearTypingInterval = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }, []);

  const speakText = useCallback(async (text: string, lang: LanguageCode, theme: string, forceSpeak: boolean = false) => {
    if (lastSpokenQuestionTextRef.current === text && !forceSpeak) {
      console.warn(`[speakText] Aborted: This question has already been spoken or is in progress.`);
      setDisplayedQuestionText(text);
      setIsSpeaking(false);
      setInterviewStage(theme !== "Conclusion" ? 'listening' : 'concluding');
      return;
    }

    console.log(`[speakText] Attempting to speak: "${text.substring(0, 50)}..."`);
    if (speakingPromiseRef.current && !forceSpeak) {
      console.warn("[speakText] Speech operation in progress. Aborting.");
      return;
    }
    clearTypingInterval();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    if (!text?.trim()) {
      setIsSpeaking(false);
      setDisplayedQuestionText(text || "");
      setInterviewStage(theme !== "Conclusion" ? 'listening' : 'concluding');
      speakingPromiseRef.current = null;
      return;
    }

    lastSpokenQuestionTextRef.current = text;
    
    setIsSpeaking(true);
    setDisplayedQuestionText('');
    let charIndex = 0;
    typingIntervalRef.current = setInterval(() => {
      charIndex++;
      if (charIndex <= text.length) setDisplayedQuestionText(text.substring(0, charIndex));
      else clearTypingInterval();
    }, 50);

    const speechOperation = async () => {
      try {
        // 1. Get the created (but not yet playing) audio element from the service.
        const audioInstance = await synthesizeSpeech(text, lang);
        
        if (audioInstance) {
          audioRef.current = audioInstance; // Store reference to the new audio element

          const handleSpeechEnd = () => {
            clearTypingInterval();
            setDisplayedQuestionText(text);
            setIsSpeaking(false);
            setInterviewStage(theme !== "Conclusion" ? 'listening' : 'concluding');
            audioRef.current = null; // Clear the ref after use
            speakingPromiseRef.current = null;
          };
          
          // 2. Set up event listeners directly here.
          audioInstance.onended = handleSpeechEnd;
          audioInstance.onerror = () => {
            onError(`Audio playback error.`);
            handleSpeechEnd(); // Still proceed to the next stage on error
          };

          // 3. Play the audio. This is now the ONLY place .play() is called.
          await audioInstance.play();

        } else {
          // This block runs if synthesizeSpeech returned null
          onError(`Speech generation failed.`);
          clearTypingInterval();
          setDisplayedQuestionText(text);
          setIsSpeaking(false);
          setInterviewStage(theme !== "Conclusion" ? 'listening' : 'concluding');
          speakingPromiseRef.current = null;
        }
      } catch (e: any) {
        if (lastSpokenQuestionTextRef.current === text) {
            lastSpokenQuestionTextRef.current = null;
        }
        onError(`Failed to get speech: ${e.message}.`);
        clearTypingInterval();
        setDisplayedQuestionText(text);
        setIsSpeaking(false);
        setInterviewStage(theme !== "Conclusion" ? 'listening' : 'concluding');
        speakingPromiseRef.current = null;
      }
    };
    speakingPromiseRef.current = speechOperation();
  }, [onError, clearTypingInterval, selectedLanguage]);

  const stopListening = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const startFallbackRecording = useCallback(async () => {
    try {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm; codecs=opus') ? 'audio/webm; codecs=opus' : 'audio/webm';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        setIsListening(false);
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) {
          setSttError("No audio recorded.");
          setVoiceInputStage('error');
          return;
        }
        setVoiceInputStage('transcribing');
        setCurrentUserResponse('Transcribing audio...');
        try {
          const transcribedText = await transcribeAudio(audioBlob, selectedLanguage);
          setCurrentUserResponse(transcribedText);
          setVoiceInputStage('readyToSubmit');
          setSttError(null);
        } catch (error: any) {
          setSttError(`Transcription failed: ${error.message}. Please try again.`);
          setCurrentUserResponse('');
          setVoiceInputStage('error');
        }
      };
      mediaRecorderRef.current.start();
    } catch (err: any) {
      setSttError(`Microphone error: ${err.message}.`);
      setIsListening(false);
      setVoiceInputStage('error');
    }
  }, [selectedLanguage]);

  const startListening = useCallback(async () => {
    setSttError(null);
    setCurrentUserResponse('');
    setVoiceInputStage('recording');
    setIsListening(true);
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
    clearTypingInterval();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.lang = selectedLanguage;
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          setCurrentUserResponse(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event) => {
          console.error("[SpeechRecognition] Error:", event.error);
          setSttError(`Speech recognition error: ${event.error}. Falling back to manual transcription.`);
          setVoiceInputStage('error');
          setIsListening(false);
          speechRecognitionRef.current = null;
          startFallbackRecording();
        };

        recognition.onend = () => {
          if (isListening) {
            recognition.start();
          } else {
            setVoiceInputStage(currentUserResponse.trim() ? 'readyToSubmit' : 'idle');
            speechRecognitionRef.current = null;
          }
        };

        recognition.start();
        return;
      } catch (err: any) {
        console.error("[SpeechRecognition] Failed to initialize:", err.message);
        setSttError(`Speech recognition unavailable: ${err.message}. Falling back to manual transcription.`);
        setVoiceInputStage('error');
        startFallbackRecording();
      }
    } else {
      console.warn("[SpeechRecognition] Not supported. Falling back to MediaRecorder.");
      setSttError("Real-time transcription not supported. Using manual transcription.");
      startFallbackRecording();
    }
  }, [isSpeaking, selectedLanguage, clearTypingInterval, isListening, currentUserResponse, startFallbackRecording]);

  const fetchAndProcessNextQuestion = useCallback(async (userAnswer?: string, currentQuestionData?: Omit<AIQuestionResponse, 'isEndOfInterview'>) => {
    if (isFetchingQuestion) {
      console.warn(`[fetchAndProcessNextQuestion] Aborted: already in progress.`);
      return;
    }

    console.log(`[fetchAndProcessNextQuestion] Fetching new question...`);
    setIsFetchingQuestion(true);
    setInterviewStage('processing');
    stopListening();
    setVoiceInputStage('idle');

    // 1. Create the most up-to-date version of the transcript, including the latest user response.
    // This becomes the single source of truth for the API call.
    const updatedTranscriptWithUserAnswer = [...transcript];
    if (userAnswer?.trim()) {
        updatedTranscriptWithUserAnswer.push({
            speaker: 'User',
            answer: userAnswer.trim(),
            theme: currentQuestionData?.theme
        });
    } else if (userAnswer !== undefined && currentQuestionData?.theme !== "Conclusion") {
        // Handle cases where the user submits an empty response to a non-concluding question.
        updatedTranscriptWithUserAnswer.push({
            speaker: 'User',
            answer: "No response provided.",
            theme: currentQuestionData?.theme
        });
    }
    
    // Immediately update the transcript with the user's answer. This helps in logging and UI consistency.
    setTranscript(updatedTranscriptWithUserAnswer);
    setCurrentUserResponse(''); // Clear the input field

    try {
      // 2. Call the API with this definitive, updated transcript.
      const aiResponse = await generateFollowUpQuestion(researchPlan, updatedTranscriptWithUserAnswer, selectedLanguage);

      if (aiResponse) {
        const newAiQuestionItem = {
          speaker: 'AI' as const,
          question: aiResponse.nextQuestionText,
          theme: aiResponse.theme,
          isProbing: aiResponse.isProbing
        };

        // 3. Update the transcript again, this time adding the new AI question.
        // Using a functional update ensures we're updating from the absolute latest state.
        setTranscript(prevTranscript => [...prevTranscript, newAiQuestionItem]);
        
        setCurrentAIQuestion(aiResponse);
        setInterviewStage(aiResponse.isEndOfInterview ? 'concluding' : 'asking');
      } else {
        throw new Error("AI returned a null or invalid response.");
      }
    } catch (err: any) {
      console.error(`[fetchAndProcessNextQuestion] Error: ${err.message}`);
      onError(`Failed to get next question: ${err.message}.`);
      const emergencyConclusion = { nextQuestionText: "An error occurred. We'll end the interview here. Thanks for your time.", theme: "Conclusion", isProbing: false, isEndOfInterview: true };
      
      // Add the error message to the transcript for visibility
      setTranscript(prev => [...prev, { speaker: 'AI', question: emergencyConclusion.nextQuestionText, theme: emergencyConclusion.theme, isProbing: emergencyConclusion.isProbing }]);
      setCurrentAIQuestion(emergencyConclusion);
      setInterviewStage('concluding');
    } finally {
      setIsFetchingQuestion(false);
      console.log("[fetchAndProcessNextQuestion] Completed, isFetchingQuestion reset to false");
    }
  }, [researchPlan, transcript, selectedLanguage, onError, stopListening, isFetchingQuestion, currentAIQuestion]);

  useEffect(() => {
    if (interviewStage === 'initial' && transcript.length === 0) {
      console.log("[useEffect] Initial fetch of first question");
      fetchAndProcessNextQuestion(undefined, undefined);
    }
    return () => {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
      if (audioRef.current) audioRef.current.pause();
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      clearTypingInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentAIQuestion && (interviewStage === 'asking' || interviewStage === 'concluding')) {
      console.log(`[useEffect] Requesting to speak new question: "${currentAIQuestion.nextQuestionText}"`);
      speakText(currentAIQuestion.nextQuestionText, selectedLanguage, currentAIQuestion.theme);
    }
  }, [currentAIQuestion, interviewStage, selectedLanguage, speakText]);

  useEffect(() => {
    if (interviewStage === 'concluding' && !isSpeaking && currentAIQuestion?.theme === "Conclusion") {
      const timer = setTimeout(() => setInterviewStage('finished'), 500);
      return () => clearTimeout(timer);
    }
    if (interviewStage === 'finished' && transcript.length > 0) {
      onInterviewComplete(transcript);
    }
  }, [interviewStage, isSpeaking, currentAIQuestion, onInterviewComplete, transcript]);

  const handleSubmitResponse = useCallback(async () => {
    if (isSpeaking || isListening || interviewStage === 'processing') {
      console.warn("[handleSubmitResponse] Aborted: speaking, listening, or processing in progress");
      return;
    }
    if (currentUserResponse.trim() === '' && currentAIQuestion?.theme !== "Conclusion") {
      onError("Please enter a response or use voice input.");
      return;
    }
    if (submitDebounceRef.current) {
      console.warn("[handleSubmitResponse] Aborted: debounced submission in progress");
      return;
    }
    submitDebounceRef.current = setTimeout(() => {
      console.log("[handleSubmitResponse] Submitting response:", currentUserResponse);
      fetchAndProcessNextQuestion(currentUserResponse, currentAIQuestion);
      submitDebounceRef.current = null;
    }, 300);
  }, [currentUserResponse, fetchAndProcessNextQuestion, onError, isSpeaking, isListening, interviewStage, currentAIQuestion]);

  const handleCompleteInterview = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
    let finalTranscript = transcript;
    if (currentUserResponse.trim()) {
      finalTranscript = [...transcript, { speaker: 'User', answer: currentUserResponse.trim(), theme: currentAIQuestion?.theme || "Conclusion" }];
    }
    onInterviewComplete(finalTranscript);
  }, [transcript, currentUserResponse, currentAIQuestion, onInterviewComplete]);

  const isConcludingQuestion = currentAIQuestion?.theme === "Conclusion";
  const isGlobalInteractionDisabled = isSpeaking || interviewStage === 'processing' || voiceInputStage === 'transcribing';

  const getVoiceButtonProps = () => {
    let buttonText = 'Voice Input';
    let buttonIcon: React.ReactNode = <Icons.Microphone />;
    let onClickAction = startListening;
    let buttonClass = '';
    let isDisabledForThisButton = isGlobalInteractionDisabled || isListening;
    switch (voiceInputStage) {
      case 'recording':
        buttonText = 'Stop Recording';
        buttonIcon = <Icons.MicrophoneSlash className="text-red-500" />;
        onClickAction = stopListening;
        buttonClass = 'bg-red-500/20 hover:bg-red-500/30';
        isDisabledForThisButton = isSpeaking || interviewStage === 'processing';
        break;
      case 'transcribing':
        buttonText = 'Transcribing...';
        buttonIcon = <LoadingSpinner size="sm" />;
        isDisabledForThisButton = true;
        break;
      case 'error':
        buttonText = 'Retry Voice';
        buttonIcon = <Icons.Microphone />;
        onClickAction = startListening;
        buttonClass = 'bg-error/20 hover:bg-error/30';
        break;
      case 'readyToSubmit':
        buttonText = 'Voice Input';
        buttonIcon = <Icons.Microphone />;
        onClickAction = startListening;
        break;
      default:
        break;
    }
    return { buttonText, buttonIcon, onClickAction, buttonClass, isDisabledForThisButton };
  };

  const { buttonText, buttonIcon, onClickAction, buttonClass, isDisabledForThisButton } = getVoiceButtonProps();

  if (interviewStage === 'initial' && transcript.length === 0) {
    return (
      <PageContainer title="Interview Session">
        <LoadingSpinner text="Initializing interview..." className="py-10" />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Interview for ${companyName} (${LANGUAGE_OPTIONS[selectedLanguage]})`} className="pb-20">
      <div className="bg-surface-container/70 backdrop-blur-lg border border-white/10 p-4 sm:p-6 rounded-3xl shadow-xl max-w-3xl mx-auto">
        {interviewStage !== 'finished' ? (
          <>
            <div className="flex items-start mb-4 p-4 bg-primary-container/60 backdrop-blur-md border border-white/5 text-on-primary-container rounded-xl shadow min-h-[100px] max-h-72 overflow-y-auto custom-scrollbar">
              <div className="flex-grow">
                <div className="flex items-center mb-1">
                  <SpeakingIndicator isActive={isSpeaking} className="mr-3" size={20} />
                  <p className="text-sm font-medium opacity-80">
                    AI Agent {isSpeaking ? 'is speaking' : 'asks'} (Theme: {currentAIQuestion?.theme || '...'})
                  </p>
                </div>
                <p className="text-lg sm:text-xl font-semibold mt-1 leading-relaxed">
                  {displayedQuestionText || currentAIQuestion?.nextQuestionText || 'Loading question...'}
                </p>
                {currentAIQuestion && !isSpeaking && interviewStage !== 'processing' && (
                  <Button variant="text" size="sm" onClick={() => speakText(currentAIQuestion.nextQuestionText, selectedLanguage, currentAIQuestion.theme, true)} leftIcon={<Icons.VolumeUp />} className="mt-2 text-on-primary-container hover:bg-primary/20 self-start">
                    Replay Question
                  </Button>
                )}
              </div>
            </div>
            <TextArea
              label="Your Response"
              value={currentUserResponse}
              onChange={(e) => setCurrentUserResponse(e.target.value)}
              rows={5}
              placeholder={isListening ? "Listening... speak now." : "Type your response or use the microphone."}
              className="mb-1"
              disabled={isGlobalInteractionDisabled || isListening}
            />
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="tonal"
                onClick={onClickAction}
                leftIcon={buttonIcon}
                size="md"
                disabled={isDisabledForThisButton}
                className={`${buttonClass} ${isDisabledForThisButton ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={buttonText}
              >
                {buttonText}
              </Button>
              {sttError && <p className="text-xs text-error ml-2">{sttError}</p>}
              {isListening && <SpeakingIndicator isActive={true} className="ml-2" size={16} />}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button variant="outlined" onClick={onCancel} disabled={isGlobalInteractionDisabled}>
                Cancel Interview
              </Button>
              {isConcludingQuestion ? (
                <Button onClick={handleCompleteInterview} rightIcon={<Icons.CheckCircle />} disabled={isGlobalInteractionDisabled}>
                  Finish Interview
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitResponse}
                  rightIcon={<Icons.ChevronRight />}
                  disabled={isGlobalInteractionDisabled || !currentUserResponse.trim()}
                >
                  {interviewStage === 'processing' ? 'Processing...' : 'Submit Response'}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Icons.CheckCircle className="text-5xl text-primary-container mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-semibold text-on-surface mb-3">
              <GradientText>Interview Complete!</GradientText>
            </h2>
            <p className="text-on-surface-variant mb-8">
              {transcript.find(item => item.speaker === 'AI' && item.theme === 'Conclusion')?.question || "Thank you for your responses."}
            </p>
            <Button size="lg" onClick={handleCompleteInterview} rightIcon={<Icons.ChartBar />}>
              Proceed to Generate Report
            </Button>
          </div>
        )}
      </div>
      {transcript.length > 0 && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold text-on-surface mb-3">Interview Log:</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto bg-surface-container-low/70 backdrop-blur-sm p-3 sm:p-4 rounded-xl custom-scrollbar border border-white/5">
            {transcript.map((item, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg shadow text-sm ${item.speaker === 'AI' ? 'bg-primary-container/60' : 'bg-surface-variant/70 ml-4 sm:ml-8'}`}
              >
                {item.speaker === 'AI' ? (
                  <p>
                    <span className="font-semibold">AI ({item.theme}):</span> {item.question}
                  </p>
                ) : (
                  <p>
                    <span className="font-semibold">You:</span> {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default InterviewScreen;