import { GoogleGenerativeAI, GenerateContentResponse } from "@google/generative-ai";
import {
    CompanyBackground,
    ResearchObjectives,
    ResearchPlan,
    ResearchReport,
    KeyQuestionnaireItem,
    IdentifiedTheme,
    IllustrativeQuote,
    InterviewTranscriptItem,
    AIQuestionResponse,
    LanguageCode,
    LANGUAGE_OPTIONS
} from '../types';
import { GEMINI_TEXT_MODEL } from '../constants';


// --- START: RECOMMENDED CHANGE ---

// A single base URL for your backend, configured in your Render environment variables.
const BASE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Construct the full endpoint URLs from the single base URL.
// These paths match the routes in your server.js file (e.g., app.post('/synthesize-speech',...))
const TTS_BACKEND_URL = `${BASE_BACKEND_URL}/synthesize-speech`;
const STT_BACKEND_URL = `${BASE_BACKEND_URL}/transcribe-speech`;

// --- END: RECOMMENDED CHANGE ---


let aiClientInstance: GoogleGenerativeAI | null = null;
let clientInitializationError: Error | null = null;

/**
 * Initializes and returns a singleton instance of the GoogleGenerativeAI client.
 * Throws an error if the API key is not configured or if initialization fails.
 */
function getAiClient(): GoogleGenerativeAI {
  if (clientInitializationError) {
    throw clientInitializationError;
  }
  if (aiClientInstance) {
    return aiClientInstance;
  }
  try {
    // Access environment variables using Vite's import.meta.env
    // The VITE_ prefix is required for variables exposed to the client-side bundle.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
       // Throw a specific error if the API key is missing
       throw new Error("VITE_GEMINI_API_KEY environment variable is not set.");
    }
    // Initialize the client with the API key
    aiClientInstance = new GoogleGenerativeAI(apiKey);
    return aiClientInstance;
  } catch (error: any) {
    console.error("Failed to initialize GoogleGenerativeAI client:", error);
    clientInitializationError = new Error(`Failed to initialize AI Client: ${error.message}`);
    throw clientInitializationError;
  }
}

/**
 * Resets the AI client instance, clearing any cached state or errors.
 * Useful for re-initializing the client, e.g., after an API key error.
 */
export function resetAiClientState(): void {
  aiClientInstance = null;
  clientInitializationError = null;
  console.log("AI client state has been reset.");
}

/**
 * Parses a JSON string from text, handling markdown code fences.
 * It attempts to parse the text directly, and if that fails,
 * it tries to extract content within markdown JSON fences (```json ... ```).
 * Includes fallback logic to find the first and last braces if fences are missing.
 * @param text The input string which may contain JSON. Can be null or undefined.
 * @returns The parsed JSON object of type T, or null if parsing fails.
 */
export function parseJsonFromText<T>(text: string | null | undefined): T | null {
  // Handle null or undefined input text immediately
  if (text === null || text === undefined) {
    console.warn("parseJsonFromText received null or undefined text input.");
    return null;
  }

  let jsonString = text.trim(); // Trim initial whitespace
  // Regex to find content inside markdown code fences, optionally specifying 'json'
  // Group 1 (.*?) captures the content inside the fences.
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonString.match(fenceRegex);

  // If a markdown fence is found and captures content, use that content
  if (match && match[1] !== undefined) {
    jsonString = match[1].trim(); // Trim the extracted content
  } else {
    // If no markdown fences are found, or the capturing group is empty,
    // we assume the entire (already trimmed) string is the JSON.
    // No action needed here as jsonString already holds text.trim().
  }

  try {
    const parsedObject = JSON.parse(jsonString) as T;
    console.log("Successfully parsed JSON:", parsedObject);
    return parsedObject;
  } catch (e1) {
    console.warn("Initial JSON.parse failed:", e1, "Attempting fallback parsing.");
    // Fallback: Try to find the first and last curly braces to extract JSON
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const extractedJson = jsonString.substring(firstBrace, lastBrace + 1);
      try {
        const parsedObject = JSON.parse(extractedJson) as T;
        console.log("Successfully parsed JSON (fallback):", parsedObject);
        return parsedObject;
      } catch (e2) {
        console.error("Fallback JSON.parse also failed:", e2);
        console.error("Original text that failed parsing (after fence extraction):", jsonString);
        return null;
      }
    }
    console.error("Could not find valid JSON structure for fallback parsing.");
    console.error("Original text that failed parsing (before fence extraction attempt):", text);
    return null;
  }
}

/**
 * Normalizes a string or array of strings into an array of non-empty strings.
 * @param value The input value, which can be a string, array of strings, or undefined.
 * @returns An array of non-empty strings.
 */
const normalizeStringOrArray = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.trim() !== '');
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [value.trim()];
  }
  return [];
};

/**
 * Fetches company background information from the Gemini API.
 * @param companyName The name of the company to analyze.
 * @returns A Promise that resolves to a CompanyBackground object or null.
 */
export async function fetchCompanyBackground(companyName: string): Promise<CompanyBackground | null> {
  const ai = getAiClient();
  // Get a generative model instance with the specified model name
  const model = ai.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const prompt = `
Analyze the company "${companyName}" and provide its background information.
Return the information as a JSON object with the following keys and structure:
{
  "industry": "Primary industry of the company (concise, e.g., 'E-commerce SaaS')",
  "productsServices": ["List of key products or services (as an array of strings, e.g., 'Online Store Builder', 'Payment Gateway Integration')"],
  "missionVision": "Company's mission and vision statement (be concise, a short paragraph or 1-2 key sentences)",
  "targetMarkets": ["List of main target markets (as an array of strings, e.g., 'Small to Medium Businesses', 'Independent Artists')"],
  "competitors": ["List of key competitors (as an array of strings, e.g., 'Shopify', 'BigCommerce')"]
}
Ensure the output is ONLY the JSON object. Do not include any explanatory text, comments, or markdown formatting before or after the JSON object itself.
If a list field has only one item, still present it as an array with one string. If no items, provide an empty array. Be brief and to the point in all descriptions.
`;

  try {
    const result = await model.generateContent(prompt);
    // Extract the text content from the API response
    const responseText = result.response.text();

    console.log("Raw Gemini API response text for Company Background:", responseText);

    const parsed = parseJsonFromText<CompanyBackground>(responseText);
    if (parsed) {
      // Normalize array fields to ensure they are always arrays of strings
      return {
        ...parsed,
        productsServices: normalizeStringOrArray(parsed.productsServices),
        targetMarkets: normalizeStringOrArray(parsed.targetMarkets),
        competitors: normalizeStringOrArray(parsed.competitors),
        industry: parsed.industry || "Not specified", // Provide default if null/empty
        missionVision: parsed.missionVision || "Not specified", // Provide default if null/empty
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching company background:", error);
    throw error;
  }
}

/**
 * Generates a user research plan based on company background and research objectives.
 * @param companyBackground The company's background information.
 * @param researchObjectives The defined research objectives.
 * @returns A Promise that resolves to a ResearchPlan object or null.
 */
export async function generateResearchPlan(companyBackground: CompanyBackground, researchObjectives: ResearchObjectives): Promise<ResearchPlan | null> {
  const ai = getAiClient();
  const model = ai.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const prompt = `
Act as an expert user research strategist.
Based on the following company background and research objectives, generate a comprehensive user research plan.

Company Background:
${JSON.stringify(companyBackground, null, 2)}

Research Objectives:
Main Objectives: ${researchObjectives.mainObjectives}
Target Audience: ${researchObjectives.targetAudience}
${researchObjectives.assumptions ? `Assumptions: ${researchObjectives.assumptions}` : ''}

Generate the research plan as a JSON object with the following structure.
Ensure all string array fields are indeed arrays of strings. For all textual descriptions and suggestions (like timeline, ethical considerations, guardrails), be concise and actionable. Prefer bullet points or short phrases where appropriate within string fields if the structure allows.
{
  "researchMethods": ["Array of 1-2 concise strings, e.g., 'Moderated User Interviews', 'Diary Study'"],
  "keyQuestionnaire": [
    { "theme": "Concise theme name (string, 2-4 words)", "questions": ["Array of 2-3 concise question strings"] }
  ],
  "guardrailsProbes": ["Array of 1-2 concise strings for guardrails or probing questions"],
  "estimatedParticipants": "Number of estimated participants (integer, e.g., 5-8)",
  "participantRecruitmentCriteria": ["Array of 2-3 concise strings for criteria"],
  "timelineSuggestion": "Brief suggested timeline (string, e.g., '1-2 weeks')",
  "ethicalConsiderations": ["Array of 1-2 concise strings for ethical considerations"]
}
Ensure the output is ONLY the JSON object. Do not include any explanatory text, comments, or markdown formatting before or after the JSON object itself.
For keyQuestionnaire, provide 2-3 themes with 2-3 questions each. Make questions open-ended and focused.
For researchMethods, suggest 1-2 most appropriate and concise methods.
For estimatedParticipants, provide a small, realistic number suitable for qualitative research.
All textual content should be brief and to the point.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("Raw Gemini API response text for Research Plan:", responseText);

    const parsed = parseJsonFromText<ResearchPlan>(responseText);
    if (parsed) {
      const validatedPlan: ResearchPlan = {
        researchMethods: normalizeStringOrArray(parsed.researchMethods),
        // Ensure keyQuestionnaire is an array of objects with theme and questions
        keyQuestionnaire: Array.isArray(parsed.keyQuestionnaire)
          ? parsed.keyQuestionnaire.map((item: any) => ({
              theme: typeof item.theme === 'string' ? item.theme : 'Untitled Theme',
              questions: normalizeStringOrArray(item.questions)
            })).filter(item => item.questions.length > 0) // Filter out themes with no questions
          : [{ theme: 'General Questions', questions: ['What are your initial thoughts?'] }], // Default if no questionnaire
        guardrailsProbes: normalizeStringOrArray(parsed.guardrailsProbes),
        estimatedParticipants: typeof parsed.estimatedParticipants === 'number' ? parsed.estimatedParticipants : 5,
        participantRecruitmentCriteria: normalizeStringOrArray(parsed.participantRecruitmentCriteria),
        timelineSuggestion: typeof parsed.timelineSuggestion === 'string' ? parsed.timelineSuggestion : 'Timeline not specified',
        ethicalConsiderations: normalizeStringOrArray(parsed.ethicalConsiderations),
      };
      // Ensure there's at least one question in the plan
      if (validatedPlan.keyQuestionnaire.length === 0) {
        validatedPlan.keyQuestionnaire = [{ theme: 'General Questions', questions: ['What are your initial thoughts regarding this topic?'] }];
      }
      return validatedPlan;
    }
    return null;
  } catch (error) {
    console.error("Error generating research plan:", error);
    throw error;
  }
}

/**
 * Generates the next follow-up question for an interview.
 * This function determines if a probing question is needed or
 * selects the next unasked question from the research plan.
 * It also handles the logic for concluding the interview.
 * @param researchPlan The current research plan.
 * @param interviewTranscript The current interview transcript.
 * @param selectedLanguage The language for the next question.
 * @returns A Promise that resolves to an AIQuestionResponse or null.
 */
export async function generateFollowUpQuestion(
  researchPlan: ResearchPlan,
  interviewTranscript: InterviewTranscriptItem[],
  selectedLanguage: LanguageCode
): Promise<AIQuestionResponse | null> {
  const ai = getAiClient();
  const model = ai.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const languageName = LANGUAGE_OPTIONS[selectedLanguage];

  let nextPlannedQuestion: { theme: string; question: string } | null = null;
  // Track which questions have already been asked to avoid repetition
  const askedQuestionsInTranscript = interviewTranscript
    .filter(item => item.speaker === 'AI' && item.question)
    .map(item => item.question);

  // Find the next unasked question from the research plan's questionnaire
  for (const themeItem of researchPlan.keyQuestionnaire) {
    for (const question of themeItem.questions) {
      if (!askedQuestionsInTranscript.includes(question)) {
        nextPlannedQuestion = { theme: themeItem.theme, question };
        break; // Found an unasked question, break inner loop
      }
    }
    if (nextPlannedQuestion) break; // Break outer loop if question found
  }

  const lastUserAnswer = interviewTranscript.filter(item => item.speaker === 'User' && item.answer).slice(-1)[0]?.answer || "No previous answer from user.";
  const lastAIQuestion = interviewTranscript.filter(item => item.speaker === 'AI' && item.question).slice(-1)[0]?.question || "This is the first question.";

  const prompt = `
You are an expert AI user research interviewer. Your goal is to conduct a natural, flowing interview based on a research plan.
The interview is being conducted in ${languageName} (${selectedLanguage}). Please formulate your questions in ${languageName}.
You need to decide the next question to ask.

Research Plan Context:
Key Questionnaire Themes and Questions: ${JSON.stringify(researchPlan.keyQuestionnaire, null, 2)}

Full Interview Transcript So Far (User responses might be in ${languageName} or mixed language):
${JSON.stringify(interviewTranscript.map(item => ({ speaker: item.speaker, text: item.speaker === 'AI' ? item.question : item.answer, theme: item.theme, isProbing: item.isProbing })), null, 2)}

Last AI Question (in ${languageName}): "${lastAIQuestion}"
Last User Answer: "${lastUserAnswer}"

Based on the last user answer and the overall interview context:
1.  Determine if a probing or follow-up question (in ${languageName}) is necessary for the last user's answer to get more detail, clarification, or explore an interesting point.
    If yes, formulate this probing question. It should be directly related to the user's last answer.
2.  If no probing question is needed, or if you just asked a probing question, select the next logical UNASKED question (in ${languageName}) from the research plan's keyQuestionnaire.
3.  If all planned questions have been asked, or you determine the interview has covered sufficient ground, you MUST set "isEndOfInterview": true and provide a polite concluding remark/question in ${languageName} as "nextQuestionText" (e.g., "Thanks, that covers all my questions. Is there anything else you'd like to add or share before we finish?"). Once "isEndOfInterview" is true, this is the final turn.
    Crucially, if there are no more UNASKED questions in the research plan, you MUST set "isEndOfInterview": true.

Return your decision as a JSON object with the following structure:
{
  "nextQuestionText": "The text of the question you will ask next, in ${languageName}.",
  "theme": "The theme of this question (from the research plan, or 'Probing' if it's a dynamic follow-up, or 'Conclusion' if ending).",
  "isProbing": true_or_false, // True if this is a dynamic follow-up to the user's last answer. False if it's a question from the plan or a concluding remark.
  "isEndOfInterview": true_or_false // MUST be true if you are asking a concluding question or believe the interview should conclude.
}

Example (Probing in ${languageName}):
User Answer: "I found it a bit confusing."
AI Response: { "nextQuestionText": "Could you tell me more about what specifically you found confusing?", "theme": "Probing", "isProbing": true, "isEndOfInterview": false }

Example (Next Planned Question in ${languageName}):
User Answer: "It was okay, I guess."
AI Response: { "nextQuestionText": "${nextPlannedQuestion ? nextPlannedQuestion.question : `Is there anything else you'd like to share in ${languageName}?`}", "theme": "${nextPlannedQuestion ? nextPlannedQuestion.theme : "Conclusion"}", "isProbing": false, "isEndOfInterview": ${!nextPlannedQuestion} }

Example (Concluding in ${languageName}):
User Answer: "No, that's all."
AI Response: { "nextQuestionText": "Great, thank you for your time today! That's all my questions.", "theme": "Conclusion", "isProbing": false, "isEndOfInterview": true }


Consider the flow. Don't ask too many probing questions in a row without returning to the plan.
Ensure nextQuestionText is never empty. If "isEndOfInterview" is true, "nextQuestionText" MUST be a polite concluding remark.

Your decision (JSON object only, no explanations):
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("Raw Gemini API response text for Follow-up Question:", responseText);

    let parsed = parseJsonFromText<AIQuestionResponse>(responseText);
    let finalResponse: AIQuestionResponse;

    if (parsed) {
        finalResponse = parsed;
    } else {
        // Fallback if parsing fails or AI response structure is unexpected
        console.warn("AI response for follow-up question was not valid JSON or unexpected, using fallback logic.");
        finalResponse = {
            nextQuestionText: nextPlannedQuestion
                ? nextPlannedQuestion.question
                : `Thank you for your responses. Is there anything else you'd like to share in ${languageName}?`,
            theme: nextPlannedQuestion ? nextPlannedQuestion.theme : "General Feedback",
            isProbing: false,
            isEndOfInterview: false // Default to false, will be adjusted by explicit logic below
        };
    }

    // --- CRUCIAL LOGIC FOR INTERVIEW CONCLUSION ---
    // If there are no more planned questions, force the interview to end.
    // This is a safeguard against the model failing to explicitly set isEndOfInterview: true.
    if (!nextPlannedQuestion) {
        finalResponse.isEndOfInterview = true;
        // Ensure a proper concluding remark if the interview is now forced to end
        if (finalResponse.nextQuestionText === '' || finalResponse.nextQuestionText.includes("Is there anything else you'd like to share")) {
             finalResponse.nextQuestionText = `Thank you for your time today. That's all the questions I have. Is there anything else you'd like to add or share before we finish?`;
        }
        finalResponse.theme = "Conclusion";
        finalResponse.isProbing = false; // It's a conclusion, not a probe
    } else if (finalResponse.isEndOfInterview && finalResponse.nextQuestionText === "") {
        // If the model explicitly says end but gives empty text, try to use next planned question or a default concluding remark
        finalResponse.nextQuestionText = nextPlannedQuestion
            ? nextPlannedQuestion.question
            : `Thank you for your time today. That's all the questions I have.`;
        finalResponse.theme = nextPlannedQuestion ? nextPlannedQuestion.theme : "Conclusion";
        finalResponse.isProbing = false;
        finalResponse.isEndOfInterview = !nextPlannedQuestion; // Re-evaluate if it's truly the end based on planned questions
    }

    // Final check to ensure nextQuestionText is never empty
    if (finalResponse.nextQuestionText === '') {
        finalResponse.nextQuestionText = `I'm ready for your response.`; // Generic fallback to prevent empty text being sent to TTS
    }
    // --- END CRUCIAL LOGIC ---

    return finalResponse;

  } catch (error) {
    console.error("Error generating follow-up question:", error);
    // Fallback in case of an error during the AI call
    const fallbackQuestionText = nextPlannedQuestion
        ? nextPlannedQuestion.question
        : `Apologies, I encountered an issue. Let's try this: Is there anything else you'd like to share in ${languageName}?`;
    const isActuallyEndOfInterview = !nextPlannedQuestion;
     return {
        nextQuestionText: fallbackQuestionText,
        theme: nextPlannedQuestion ? nextPlannedQuestion.theme : "Conclusion",
        isProbing: false,
        isEndOfInterview: isActuallyEndOfInterview
    };
  }
}


/**
 * Generates a research report based on the research plan and interview transcript.
 * @param researchPlan The research plan used for the interview.
 * @param interviewTranscript The recorded interview transcript.
 * @returns A Promise that resolves to a ResearchReport object or null.
 */
export async function generateResearchReport(researchPlan: ResearchPlan, interviewTranscript: InterviewTranscriptItem[]): Promise<ResearchReport | null> {
  const ai = getAiClient();
  const model = ai.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  // Prepare a cleaner transcript for the LLM prompt
  const relevantTranscript = interviewTranscript.map(item => {
    if (item.speaker === 'User') return { speaker: 'User', answer: item.answer || item.text };
    if (item.speaker === 'AI') return { speaker: 'AI', question: item.question || item.text, theme: item.theme };
    return item;
  });

  const prompt = `
Act as a research analyst. You have conducted user research based on the following research plan and gathered data from an interview session.

Research Plan:
${JSON.stringify(researchPlan, null, 2)}

Interview Transcript (AI questions and Participant's responses):
${JSON.stringify(relevantTranscript, null, 2)}

Now, generate an insightful research report. This report's findings, themes, and illustrative quotes MUST be derived primarily from the provided Interview Transcript. Use the Research Plan for context about objectives and methods.
The report should be a JSON object with the following structure:
{
  "executiveSummary": "A concise summary of the key findings and insights derived from the interview transcript (string).",
  "keyFindings": ["An array of strings detailing the most important findings directly supported by the interview transcript."],
  "identifiedThemes": [
    { "theme": "Name of the theme identified from analyzing the interview transcript (string)", "description": "Description of the theme, supported by evidence from the transcript (string)" }
  ],
  "illustrativeQuotes": [
    { "quote": "A direct, verbatim quote from a user's answer in the interview transcript that illustrates a key finding or theme (string)", "attribution": "Source of the quote (e.g., 'Participant Response to: [Original Question Text]' or 'Participant - Theme: [Theme Name]')" }
  ],
  "recommendations": ["An array of actionable recommendations based on the findings from the transcript."]
}
Ensure the output is ONLY the JSON object. Do not include any explanatory text, comments, or markdown formatting before or after the JSON object itself.
Prioritize authenticity to the transcript. If the transcript is brief or uninformative, reflect that in the report (e.g., fewer findings, simpler themes).
Provide 2-3 key findings, 1-2 identified themes, 1-2 illustrative quotes (MUST be from transcript), and 2-3 recommendations.
All textual content should be concise and directly based on the provided transcript.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("Raw Gemini API response text for Research Report:", responseText);

    const parsed = parseJsonFromText<ResearchReport>(responseText);
    if (parsed) {
      // Validate and normalize report fields
      return {
        executiveSummary: typeof parsed.executiveSummary === 'string' && parsed.executiveSummary.trim() !== '' ? parsed.executiveSummary : 'Executive summary not available.',
        keyFindings: normalizeStringOrArray(parsed.keyFindings).length > 0 ? normalizeStringOrArray(parsed.keyFindings) : ['No specific key findings were derived from the interview.'],
        identifiedThemes: Array.isArray(parsed.identifiedThemes)
          ? parsed.identifiedThemes.map((item: any) => ({
              theme: typeof item.theme === 'string' ? item.theme : 'Untitled Theme',
              description: typeof item.description === 'string' ? item.description : 'No description provided.'
            })).filter(item => item.theme !== 'Untitled Theme' || item.description !== 'No description provided.')
          : [{ theme: 'General Theme', description: 'General observations from the interview.' }],
        illustrativeQuotes: Array.isArray(parsed.illustrativeQuotes)
          ? parsed.illustrativeQuotes.map((item: any) => ({
              quote: typeof item.quote === 'string' ? item.quote : 'No quote available.',
              attribution: typeof item.attribution === 'string' ? item.attribution : 'Participant'
            })).filter(item => item.quote !== 'No quote available.')
          : [{ quote: 'No illustrative quotes were extracted from the interview.', attribution: 'System Note'}],
        recommendations: normalizeStringOrArray(parsed.recommendations).length > 0 ? normalizeStringOrArray(parsed.recommendations) : ['No specific recommendations were derived from the interview.'],
      };
    }
    return null;
  } catch (error) {
    console.error("Error generating research report:", error);
    throw error;
  }
}

/**
 * Synthesizes speech using a backend service (Google Cloud TTS via proxy).
 * This function now creates and returns a playable Audio element without starting playback itself.
 * @param text The text to synthesize.
 * @param lang The language code (e.g., 'en-US', 'hi-IN').
 * @returns A Promise that resolves to an HTMLAudioElement or null on error.
 */
export async function synthesizeSpeech(text: string, lang: LanguageCode): Promise<HTMLAudioElement | null> {
  if (!text || text.trim() === '') {
    console.warn("synthesizeSpeech: No text provided for speech synthesis.");
    return null;
  }
  
  console.log(`synthesizeSpeech: Sending request to backend for text: "${text.substring(0, Math.min(text.length, 50))}..." in ${lang}`);

  try {
    const response = await fetch(TTS_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, lang }),
    });

    if (!response.ok) {
      const errorData = await response.text(); // Get error message from backend
      console.error(`synthesizeSpeech: Backend response not OK: ${response.status} - ${errorData}`);
      throw new Error(`Failed to synthesize speech: ${errorData || response.statusText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    console.log("synthesizeSpeech: Received audio blob from backend. Returning audio element.");
    
    // Create the audio element but DO NOT play it here.
    // Return the element directly for the caller to control.
    const audio = new Audio(audioUrl);
    
    // Set up a one-time event listener to clean up the object URL after playback finishes.
    audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        console.log("Audio ended and Blob URL revoked.");
    }, { once: true });

    return audio;

  } catch (error: any) {
    console.error("synthesizeSpeech: Error during fetch:", error);
    throw error; // Re-throw the error for the caller to handle
  }
}

/**
 * Transcribes audio data using a backend service (Google Cloud Speech-to-Text via proxy).
 * @param audioBlob The audio data as a Blob.
 * @param lang The language code (e.g., 'en-US', 'hi-IN').
 * @returns A Promise that resolves to the transcribed text (string) or throws an error.
 */
export async function transcribeAudio(audioBlob: Blob, lang: LanguageCode): Promise<string> {
  if (!audioBlob) {
    throw new Error("transcribeAudio: No audio blob provided for transcription.");
  }

  console.log(`transcribeAudio: Sending audio blob to backend for transcription in ${lang}.`);

  try {
    const formData = new FormData();
    // It's crucial that the 'audio' field name and filename ('audio.webm')
    // match what your backend expects from `formidable`.
    formData.append('audio', audioBlob, 'audio.webm'); 
    formData.append('lang', lang);

    const response = await fetch(STT_BACKEND_URL, {
      method: 'POST',
      body: formData, // FormData automatically sets 'Content-Type': 'multipart/form-data'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`transcribeAudio: Backend response not OK: ${response.status} - ${errorData}`);
      throw new Error(`Failed to transcribe audio: ${errorData || response.statusText}`);
    }

    const result = await response.json();
    if (!result || !result.transcript) {
      console.warn("transcribeAudio: Backend returned no transcript.");
      return ''; // Return empty string if no transcript
    }

    console.log("transcribeAudio: Received transcript from backend:", result.transcript);
    return result.transcript;

  } catch (error: any) {
    console.error("transcribeAudio: Error during fetch or transcription:", error);
    throw error;
  }
}