

import { GoogleGenAI, Type, Chat, GenerateContentResponse, LiveServerMessage, Modality, FunctionDeclaration, LiveSession, Blob, GoogleMapsGroundingChunk, GoogleWebGroundingChunk } from "@google/genai";
import type { SkincareAnalysis, GroundingResult, ChatMessage, UserProfile, RoutinePreferences, MedicalQuestionnaireData, Dermatologist, SkinConcern } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

// Keep a single instance for general API calls as key is static (from env var)
// Per-request instantiation is more critical for dynamic key selection (e.g., Veo)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 250;

/**
 * Checks if the caught error is a rate limit error (HTTP 429).
 * The @google/genai SDK might not expose HTTP status codes directly in all error types,
 * so we also check the error message as a fallback.
 */
const isRateLimitError = (error: any): boolean => {
    // Check for a status property, common in Google API client libraries
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.httpStatus === 429) {
        return true;
    }
    // Check for common phrasing in error messages
    if (error?.message && (error.message.includes('429') || /rate limit/i.test(error.message))) {
        return true;
    }
    return false;
};


/**
 * A wrapper function that adds retry logic with exponential backoff and jitter to an API call.
 * This helps handle transient errors like rate limits (429 Too Many Requests).
 * @param apiCall The function that makes the API call.
 * @returns The result of the API call.
 */
export async function withRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await apiCall();
        } catch (e: any) {
            lastError = e;
            if (isRateLimitError(e)) {
                if (attempt < MAX_RETRIES - 1) {
                    // Exponential backoff with jitter
                    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 100;
                    console.warn(`Rate limit hit. Retrying in ${delay.toFixed(0)}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error("Max retries reached for rate-limited request.");
                }
            } else {
                // Not a rate limit error, re-throw immediately
                throw e;
            }
        }
    }
    throw lastError ?? new Error("Max retries reached, but no error was captured.");
}

// Utility to convert File to GenerativeContentPart for multimodal input
export const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export const analyzeSkinImage = async (
    imageFile: File, 
    medicalData: MedicalQuestionnaireData | null,
    isAdvanced: boolean // Added flag for advanced analysis
): Promise<SkincareAnalysis> => {
    const imagePart = await fileToGenerativePart(imageFile);
    
    let medicalContextPrompt = '';
    const medicalContext = [];
    if (medicalData) {
        if (medicalData.medicalHistory) medicalContext.push(`Medical History: ${medicalData.medicalHistory}`);
        if (medicalData.currentMedications) medicalContext.push(`Current Medications: ${medicalData.currentMedications}`);
        if (medicalData.concomitantMedications) medicalContext.push(`Concomitant Medications: ${medicalData.concomitantMedications}`);
        if (medicalData.signsSymptoms) medicalContext.push(`Signs & Symptoms: ${medicalData.signsSymptoms}`);
        if (medicalData.labWork) medicalContext.push(`Lab Work: ${medicalData.labWork}`);
        if (medicalData.recentVaccinations) medicalContext.push(`Recent Vaccinations: ${medicalData.recentVaccinations}`);

        if (medicalContext.length > 0) {
            medicalContextPrompt = `
        User's Medical Context:
        ${medicalContext.map(item => `- ${item}`).join('\n')}

        Carefully integrate this medical context into your analysis to infer potential causes and important considerations.
            `;
        }
    }

    const standardPrompt = `
        As a highly specialized dermatological AI assistant, perform a detailed analysis of the provided high-resolution skin image,
        taking into account the user's provided medical information if available. Your analysis must be objective, scientific,
        and strictly based on visual evidence, enhanced by the medical context.
        ${medicalContextPrompt}
        1.  **Primary Concerns Identification:** Systematically identify and list all observable skin concerns. For each concern, provide the following:
            *   \`concern\`: A precise clinical or common name (e.g., 'Closed Comedones', 'Hyperpigmentation', 'Inflammatory Acne Papules').
            *   \`description\`: A concise, clinical description of what is visually present in the image for that concern.
            *   \`severity\`: An objective severity rating from one of: 'Mild', 'Moderate', 'Severe'.

        2.  **Potential Causes (Inferred from image and context):** Based on the visual findings and the provided medical context (if any), infer and list potential causes or contributing factors to the observed skin conditions. If no medical data is provided, infer solely from the image. If no clear inferences can be made, state that.
            *   \`potentialCauses\`: A concise explanation of possible reasons behind the skin conditions, integrating medical context.

        3.  **Important Considerations (Safety & Interactions):** Based on the observed concerns and medical context (if any), provide crucial considerations regarding product choices, potential drug-skincare interactions, or when to seek professional medical advice. If no specific considerations arise, state that.
            *   \`importantConsiderations\`: Key advice regarding safety, interactions, and professional consultation.

        4.  **Product Recommendations:** Based *only* on the identified concerns and *considering the medical context for safety*, recommend specific types of skincare products. For each recommendation, provide:
            *   \`name\`: A generic product name (e.g., 'Salicylic Acid Cleanser', 'Niacinamide Serum').
            *   \`brand\`: A well-regarded, widely available example brand (e.g., 'CeraVe', 'The Ordinary').
            *   \`type\`: The product category from this list: 'Cleanser', 'Moisturizer', 'Serum', 'Sunscreen' | 'Toner' | 'Treatment'.
            *   \`reason\`: A clear, scientific reason explaining how this product type addresses one or more of the identified concerns, taking into account the medical context.

        5.  **Overall Summary:** Conclude with a brief, professional summary of the findings. Maintain an encouraging but clinical tone.

        CRITICAL: Your entire output must be a single, valid JSON object conforming to the provided schema. Do not include any text or formatting outside of the JSON structure.
    `;
    
    // This prompt simulates the output of a more specialized model like SkinGPT-4 by requesting advanced fields.
    const advancedPrompt = `
        As a leading-edge pre-trained multimodal large language model specializing in dermatological diagnosis,
        perform an exhaustive, clinical-grade analysis of the provided high-resolution skin image.
        You must deeply integrate the user's provided medical information to formulate a comprehensive diagnostic picture.
        Your analysis must be objective, scientific, and strictly based on visual evidence, enhanced by the medical context.
        ${medicalContextPrompt ? medicalContextPrompt : 'No medical context was provided.'}
        
        Your diagnostic report must include the following sections:

        1.  **Confidence Score:** A numerical confidence score (from 0.0 to 1.0) for your primary diagnosis.
        2.  **Primary Concerns Identification:** Systematically identify and list all observable skin concerns. This forms your primary diagnosis.
        3.  **Differential Diagnosis:** List other possible conditions that could present similarly.
        4.  **Potential Causes & Pathophysiology:** Infer potential etiological factors and briefly explain the likely pathophysiology.
        5.  **Recommended Diagnostic Tests:** Suggest potential tests a dermatologist might perform to confirm the diagnosis.
        6.  **Important Considerations (Safety & Interactions):** Provide critical warnings, potential drug-skincare interactions, or contraindications.
        7.  **Product Recommendations:** Recommend specific types of skincare products with scientific rationale.
        8.  **Overall Summary:** A professional, clinical summary of the findings.

        CRITICAL: Your entire output must be a single, valid JSON object. Do not include any text or formatting outside of this JSON.
    `;

    const standardSchema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: "A brief, professional, and encouraging summary of the analysis." },
            concerns: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        concern: { type: Type.STRING, description: "Clinical or common name of the skin concern, e.g., 'Acne Vulgaris'." },
                        description: { type: Type.STRING, description: "A short, clinical description of the concern." },
                        severity: { type: Type.STRING, description: "Severity level: 'Mild', 'Moderate', or 'Severe'." }
                    },
                    required: ["concern", "description", "severity"]
                }
            },
            potentialCauses: { type: Type.STRING, description: "Inferred potential causes or contributing factors, considering medical context." },
            importantConsiderations: { type: Type.STRING, description: "Key advice regarding safety, interactions, and professional consultation, considering medical context." },
            recommendations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "Generic name of the product, e.g., 'Gentle Skin Cleanser'." },
                        brand: { type: Type.STRING, description: "Example brand name, e.g., 'Cetaphil'." },
                        type: { type: Type.STRING, description: "Product type from the allowed list, e.g., 'Cleanser', 'Moisturizer', 'Serum'." },
                        reason: { type: Type.STRING, description: "Scientific reason why this product is recommended." }
                    },
                    required: ["name", "brand", "type", "reason"]
                }
            }
        },
        required: ["summary", "concerns", "potentialCauses", "importantConsiderations", "recommendations"]
    };

    const advancedSchema = {
        type: Type.OBJECT,
        properties: {
            confidenceScore: { type: Type.NUMBER, description: "A numerical confidence score (0.0 to 1.0) for the primary diagnosis." },
            summary: { type: Type.STRING, description: "A brief, professional, and encouraging summary of the analysis." },
            concerns: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        concern: { type: Type.STRING, description: "Clinical or common name of the skin concern, e.g., 'Acne Vulgaris'." },
                        description: { type: Type.STRING, description: "A short, clinical description of the concern." },
                        severity: { type: Type.STRING, description: "Severity level: 'Mild', 'Moderate', or 'Severe'." }
                    },
                    required: ["concern", "description", "severity"]
                }
            },
            differentialDiagnosis: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        condition: { type: Type.STRING, description: "The name of the alternative condition." },
                        confidence: { type: Type.STRING, description: "Confidence level: 'High', 'Medium', or 'Low'." },
                        reasoning: { type: Type.STRING, description: "Why this is a plausible alternative." }
                    },
                    required: ["condition", "confidence", "reasoning"]
                },
                description: "Other possible conditions that could present similarly."
            },
            potentialCauses: { type: Type.STRING, description: "Inferred potential causes or contributing factors, considering medical context." },
            recommendedTests: { type: Type.STRING, description: "Potential diagnostic tests a dermatologist might perform." },
            importantConsiderations: { type: Type.STRING, description: "Key advice regarding safety, interactions, and professional consultation, considering medical context." },
            recommendations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "Generic name of the product, e.g., 'Gentle Skin Cleanser'." },
                        brand: { type: Type.STRING, description: "Example brand name, e.g., 'Cetaphil'." },
                        type: { type: Type.STRING, description: "Product type from the allowed list, e.g., 'Cleanser', 'Moisturizer', 'Serum'." },
                        reason: { type: Type.STRING, description: "Scientific reason why this product is recommended." }
                    },
                    required: ["name", "brand", "type", "reason"]
                }
            }
        },
        required: ["confidenceScore", "summary", "concerns", "differentialDiagnosis", "potentialCauses", "recommendedTests", "importantConsiderations", "recommendations"]
    };

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: isAdvanced ? advancedPrompt : standardPrompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: isAdvanced ? advancedSchema : standardSchema
        }
    }));

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as SkincareAnalysis;
    } catch (e) {
        console.error("Failed to parse Gemini response:", e);
        throw new Error("Could not get a valid analysis from the AI. Please try another image.");
    }
};

export const generateSkincareRoutine = async (analysis: SkincareAnalysis, preferences: RoutinePreferences, userProfile: UserProfile | null, medicalData: MedicalQuestionnaireData | null): Promise<string> => {
    let prompt = `
        Based on the following skincare analysis, create a detailed, step-by-step daily skincare routine.
        The user has these concerns: ${analysis.concerns.map(c => `${c.concern} (${c.severity})`).join(', ')}.
        The analysis recommended these products: ${analysis.recommendations.map(p => `${p.name} (${p.type})`).join(', ')}.
        
        `;

    if (userProfile) {
        prompt += `User Profile: Skin Type: ${userProfile.skinType}. Known Allergies: ${userProfile.allergies.join(', ') || 'None'}. Skincare Goals: ${userProfile.goals}.\n`;
    }
    if (medicalData) {
        const medicalContext = [];
        if (medicalData.medicalHistory) medicalContext.push(`Medical History: ${medicalData.medicalHistory}`);
        if (medicalData.currentMedications) medicalContext.push(`Current Medications: ${medicalData.currentMedications}`);
        if (medicalData.concomitantMedications) medicalContext.push(`Concomitant Medications: ${medicalData.concomitantMedications}`);
        if (medicalData.signsSymptoms) medicalContext.push(`Signs & Symptoms: ${medicalData.signsSymptoms}`);
        if (medicalData.labWork) medicalContext.push(`Lab Work: ${medicalData.labWork}`);
        if (medicalData.recentVaccinations) medicalContext.push(`Recent Vaccinations: ${medicalData.recentVaccinations}`);
        if (medicalContext.length > 0) {
            prompt += `Medical Context: ${medicalContext.join('; ')}.\n`;
        }
    }

    prompt += `
        User preferences:
        - Intensity: ${preferences.intensity}
        - Time Commitment: ${preferences.timeCommitment}

        Your response should:
        1.  Be formatted in Markdown.
        2.  Be very encouraging and easy for a beginner to understand.
        3.  Be divided into two main sections: "Morning Routine (AM)" and "Evening Routine (PM)".
        4.  Within each section, list the steps in the correct order (e.g., Cleanser, Toner, Serum, Moisturizer, Sunscreen).
        5.  For each step, explain *why* it's important for the user's specific concerns, taking into account their preferences, user profile, and medical context (e.g., avoiding allergens or considering medication interactions).
        6.  Incorporate the recommended product *types* into the routine. For example, if a "Vitamin C Serum" was recommended, include a "Serum" step in the AM routine and explain its benefits.
        7.  End with a "Weekly Extras" section suggesting things like exfoliation or face masks, if applicable, and a final encouraging tip.
        8.  Include a disclaimer that this is a suggested routine and patch testing new products is important.
        9. Adjust the routine's complexity and number of steps based on the user's time commitment preference "${preferences.timeCommitment}".
        10. Adjust the product recommendations and advice based on the user's intensity preference "${preferences.intensity}", and also considering user profile and medical context.
    `;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
    }));

    return response.text;
};

// --- Live API Utilities ---
export function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}


interface LiveSessionCallbacks {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}

export const startLiveSession = async (
    callbacks: LiveSessionCallbacks,
    userProfile: UserProfile | null,
    medicalData: MedicalQuestionnaireData | null, // Added medical data
    onTranscription: (type: 'input' | 'output', text: string) => void,
    onTurnComplete: () => void,
): Promise<LiveSession> => {
    let systemInstruction = `You are DermaGenius, a friendly and knowledgeable AI skincare assistant. Your goal is to provide helpful, safe, and informative advice on skincare. You are not a medical professional. Always remind users to consult a dermatologist for serious medical conditions. Be encouraging and positive in your tone.`;

    if (userProfile) {
        systemInstruction += `\n\nUser Profile: Skin Type: ${userProfile.skinType}. Known Allergies: ${userProfile.allergies.join(', ') || 'None'}. Skincare Goals: ${userProfile.goals}. Tailor advice to this profile.`;
    }
    if (medicalData) {
        const medicalContext = [];
        if (medicalData.medicalHistory) medicalContext.push(`Medical History: ${medicalData.medicalHistory}`);
        if (medicalData.currentMedications) medicalContext.push(`Current Medications: ${medicalData.currentMedications}`);
        if (medicalData.concomitantMedications) medicalContext.push(`Concomitant Medications: ${medicalData.concomitantMedications}`);
        if (medicalData.signsSymptoms) medicalContext.push(`Signs & Symptoms: ${medicalData.signsSymptoms}`);
        if (medicalData.labWork) medicalContext.push(`Lab Work: ${medicalData.labWork}`);
        if (medicalData.recentVaccinations) medicalContext.push(`Recent Vaccinations: ${medicalData.recentVaccinations}`);
        if (medicalContext.length > 0) {
            systemInstruction += `\n\nUser Medical Context: ${medicalContext.join('; ')}. Keep this in mind for all advice, especially regarding safety, interactions, and contraindications.`;
        }
    }

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: callbacks.onopen,
            onmessage: (message: LiveServerMessage) => {
                // Handle transcription
                if (message.serverContent?.outputTranscription) {
                    onTranscription('output', message.serverContent.outputTranscription.text);
                }
                if (message.serverContent?.inputTranscription) {
                    onTranscription('input', message.serverContent.inputTranscription.text);
                }
                if (message.serverContent?.turnComplete) {
                    onTurnComplete();
                }

                callbacks.onmessage(message); // Pass original message for audio processing
            },
            onerror: callbacks.onerror,
            onclose: callbacks.onclose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // Can explore other voices like 'Puck', 'Kore'
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {}, // Enable transcription for user input audio.
            outputAudioTranscription: {}, // Enable transcription for model output audio.
        },
    });

    return sessionPromise;
};


export const processAudioChunk = async (
    sessionPromise: Promise<LiveSession>,
    inputData: Float32Array
) => {
    const pcmBlob = createBlob(inputData);
    sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
    });
};

export const processImageFrame = async (
    sessionPromise: Promise<LiveSession>,
    base64Data: string,
    mimeType: string
) => {
    sessionPromise.then((session) => {
        session.sendRealtimeInput({
            media: { data: base64Data, mimeType: mimeType }
        });
    });
};

export const stopLiveSession = async (session: LiveSession | null) => {
    if (session) {
        session.close();
    }
};

// --- Standard Chat Functions ---

export const createChatSession = (history?: ChatMessage[], userProfile?: UserProfile | null, medicalData?: MedicalQuestionnaireData | null): Chat => {
    const geminiHistory = history?.map(msg => {
        const parts: any[] = [{ text: msg.text }];
        // Add image part if available in history for multimodal context
        if (msg.imagePreviewUrl) {
            // NOTE: For sending actual image data in history, you'd need the base64, not just preview URL.
            // For simplicity here, we assume history images are mainly for display or would require re-upload.
            // If full persistence of image data for chat history is needed, store base64 in ChatMessage.
        }
        return { role: msg.role, parts };
    });

    let systemInstruction = `You are DermaGenius, a friendly and knowledgeable AI skincare assistant. Your goal is to provide helpful, safe, and informative advice on skincare.
    You are not a medical professional. Always remind users to consult a dermatologist for serious medical conditions.
    Be encouraging and positive in your tone.`;

    if (userProfile) {
        systemInstruction += `\n\nUser Profile: Skin Type: ${userProfile.skinType}. Known Allergies: ${userProfile.allergies.join(', ') || 'None'}. Skincare Goals: ${userProfile.goals}. Tailor advice to this profile.`;
    }
    if (medicalData) {
        const medicalContext = [];
        if (medicalData.medicalHistory) medicalContext.push(`Medical History: ${medicalData.medicalHistory}`);
        if (medicalData.currentMedications) medicalContext.push(`Current Medications: ${medicalData.currentMedications}`);
        if (medicalData.concomitantMedications) medicalContext.push(`Concomitant Medications: ${medicalData.concomitantMedications}`);
        if (medicalData.signsSymptoms) medicalContext.push(`Signs & Symptoms: ${medicalData.signsSymptoms}`);
        if (medicalData.labWork) medicalContext.push(`Lab Work: ${medicalData.labWork}`);
        if (medicalData.recentVaccinations) medicalContext.push(`Recent Vaccinations: ${medicalData.recentVaccinations}`);
        if (medicalContext.length > 0) {
            systemInstruction += `\n\nUser Medical Context: ${medicalContext.join('; ')}. Keep this in mind for all advice, especially regarding safety, interactions, and contraindications.`;
        }
    }


    return ai.chats.create({
        model: 'gemini-2.5-flash',
        history: geminiHistory,
        config: {
            systemInstruction: systemInstruction,
        },
    });
};

export const sendChatMessageStream = async (
    chatInstance: Chat,
    message: string,
    attachedImageFile: File | null
): Promise<AsyncGenerator<GenerateContentResponse>> => {
    const parts: any[] = [{ text: message }];
    if (attachedImageFile) {
        parts.unshift(await fileToGenerativePart(attachedImageFile)); // Add image at the beginning
    }

    // FIX: The `sendMessageStream` method for a Chat object expects a `{ message: ... }` payload,
    // not `{ contents: ... }`. This was causing the "ContentUnion is required" error.
    return withRetry(() => chatInstance.sendMessageStream({ message: parts }));
};


export const getDeepAnalysis = async (prompt: string, userProfile: UserProfile | null, medicalData: MedicalQuestionnaireData | null) => {
    let combinedPrompt = prompt;
    if (userProfile) {
        combinedPrompt = `Considering the user's profile (Skin Type: ${userProfile.skinType}, Allergies: ${userProfile.allergies.join(', ') || 'None'}, Goals: ${userProfile.goals}), ${prompt}`;
    }
    if (medicalData) {
        const medicalContext = [];
        if (medicalData.medicalHistory) medicalContext.push(`Medical History: ${medicalData.medicalHistory}`);
        if (medicalData.currentMedications) medicalContext.push(`Current Medications: ${medicalData.currentMedications}`);
        if (medicalData.concomitantMedications) medicalContext.push(`Concomitant Medications: ${medicalData.concomitantMedications}`);
        if (medicalData.signsSymptoms) medicalContext.push(`Signs & Symptoms: ${medicalData.signsSymptoms}`);
        if (medicalData.labWork) medicalContext.push(`Lab Work: ${medicalData.labWork}`);
        if (medicalData.recentVaccinations) medicalContext.push(`Recent Vaccinations: ${medicalData.recentVaccinations}`);
        if (medicalContext.length > 0) {
            combinedPrompt += `\n\nAlso considering user's medical context: ${medicalContext.join('; ')}.`;
        }
    }

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: combinedPrompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
    }));
    return { text: response.text };
};

export async function getGroundedAnswer(
    prompt: string,
    tool: 'googleSearch' | 'googleMaps',
    location?: { latitude: number; longitude: number }
): Promise<{ text: string; groundingResults?: GroundingResult[] }> {
    let toolsConfig: any = {};
    if (tool === 'googleSearch') {
        toolsConfig = { tools: [{ googleSearch: {} }] };
    } else if (tool === 'googleMaps') {
        toolsConfig = { tools: [{ googleMaps: {} }] };
        if (location) {
            toolsConfig.toolConfig = {
                retrievalConfig: {
                    latLng: location
                }
            };
        }
    }

    // The model configuration must adhere to the rules for grounding:
    // DO NOT set responseMimeType or responseSchema when using grounding tools.
    // FIX: Add explicit type to the response object to resolve property access errors.
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash', // Gemini Flash is suitable for grounding tasks
        contents: prompt,
        config: toolsConfig,
    }));

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let groundingResults: GroundingResult[] | undefined;

    if (groundingChunks && groundingChunks.length > 0) {
        groundingResults = groundingChunks.map(chunk => {
            if (chunk.web) {
                const webChunk = chunk.web as GoogleWebGroundingChunk;
                return { web: { uri: webChunk.uri, title: webChunk.title || webChunk.uri } };
            }
            if (chunk.maps) {
                const mapsChunk = chunk.maps as GoogleMapsGroundingChunk;
                return {
                    maps: {
                        uri: mapsChunk.uri,
                        title: mapsChunk.title || mapsChunk.uri,
                        // Map SDK's `reviewSnippetText` to local type's `text`
                        placeAnswerSources: mapsChunk.placeAnswerSources && mapsChunk.placeAnswerSources.length > 0
                            ? { reviewSnippets: mapsChunk.placeAnswerSources.map(s => ({ text: s.reviewSnippetText })) }
                            : undefined
                    }
                };
            }
            return null;
        }).filter(Boolean) as GroundingResult[];
    }

    return { text: response.text, groundingResults };
}


export const findDermatologists = async (concerns: SkinConcern[], zipCode: string): Promise<Dermatologist[]> => {
    const concernText = concerns.map(c => c.concern).join(', ');
    const prompt = `Find top-rated dermatologists near the zip code ${zipCode} who specialize in treating the following conditions: ${concernText}. For each one, provide their name, full address, and a Google Maps link.`;
    
    // Using the more reliable grounding metadata instead of asking for JSON in the text response
    // FIX: Add explicit type to the response object to resolve property access errors.
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }],
        }
    }));

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!groundingChunks) {
        return [];
    }

    const dermatologists: Dermatologist[] = [];
    
    groundingChunks.forEach(chunk => {
        if (chunk.maps) {
            const mapsChunk = chunk.maps as GoogleMapsGroundingChunk;
            // The title from maps is usually the name, and the uri is the link.
            // Address needs to be inferred or is part of the title sometimes. We'll use the title as the address for now as the API does not return it separately.
            if (mapsChunk.title && mapsChunk.uri) {
                 dermatologists.push({
                    name: mapsChunk.title,
                    address: mapsChunk.placeAnswerSources?.[0]?.placeData?.address || "Address not available",
                    mapsUri: mapsChunk.uri,
                });
            }
        }
    });

    if (dermatologists.length === 0 && response.text) {
        // Fallback if no grounding chunks are returned but we get a text response
        console.log("No structured map data, attempting to parse text: ", response.text);
    }

    // Remove duplicates based on name and URI
    const uniqueDermatologists = Array.from(new Map(dermatologists.map(item => [`${item.name}-${item.mapsUri}`, item])).values());

    return uniqueDermatologists;
};
