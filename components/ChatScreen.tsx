import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GenerateContentResponse, LiveSession, Chat, LiveServerMessage } from '@google/ai';
import { GroundingResultDisplay } from './GroundingResult';
import {
    createChatSession,
    getGroundedAnswer,
    getDeepAnalysis,
    withRetry,
    fileToGenerativePart,
    sendChatMessageStream,
    startLiveSession,
    stopLiveSession,
    processAudioChunk,
    decodeAudioData,
    decode
} from '../services/geminiService';
import { SkincareAnalysis, ChatMessage, ChatRole, ActiveTab, AnalysisRecord, UserProfile, GroundingResult } from '../types';

declare var marked: { parse: (text: string) => string };

interface ChatScreenProps {
    activeTab: ActiveTab;
    currentAnalysis: AnalysisRecord;
    userProfile: UserProfile | null;
    initialChatHistory: ChatMessage[];
    onChatHistoryUpdate: (history: ChatMessage[]) => void;
    location: GeolocationCoordinates | null;
    locationError: string | null;
}

const ChatScreen: React.FC<ChatScreenProps> = ({
    activeTab,
    currentAnalysis,
    userProfile,
    initialChatHistory,
    onChatHistoryUpdate,
    location,
    locationError
}) => {
    // --- State managed by this screen ---
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialChatHistory);
    const [chatInput, setChatInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [useDeepAnalysis, setUseDeepAnalysis] = useState(false);
    const [attachedImage, setAttachedImage] = useState<File | null>(null);
    const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);

    // Live API (Voice Interaction) states
    const [isListening, setIsListening] = useState(false);
    const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
    const [micStream, setMicStream] = useState<MediaStream | null>(null);
    const [audioInputProcessor, setAudioInputProcessor] = useState<ScriptProcessorNode | null>(null);
    const [currentInputTranscription, setCurrentInputTranscription] = useState('');
    const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const [sessionError, setSessionError] = useState<string | null>(null);


    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatInstanceRef = useRef<Chat | null>(null);

    // --- Effects ---

    // Initialize/Re-initialize chat instance when context changes
    useEffect(() => {
        chatInstanceRef.current = createChatSession(chatHistory, userProfile, currentAnalysis?.medicalData);
    }, [chatHistory, userProfile, currentAnalysis]);

    // Propagate chat history updates to parent
    useEffect(() => {
        onChatHistoryUpdate(chatHistory);
    }, [chatHistory, onChatHistoryUpdate]);


    // Scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isStreaming, isListening, currentInputTranscription, currentOutputTranscription]);
    
    // Handle attached image preview
    useEffect(() => {
        if (!attachedImage) {
            setAttachedImagePreview(null);
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setAttachedImagePreview(reader.result as string);
        reader.readAsDataURL(attachedImage);
    }, [attachedImage]);

    // Setup and teardown for Live API audio context
    useEffect(() => {
        // Setup
        outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        outputNodeRef.current.connect(outputAudioContextRef.current.destination);

        // Teardown
        return () => {
            stopMic();
            outputAudioContextRef.current?.close().catch(console.error);
        };
    }, []); // Run only once on mount

    // --- Live API (Voice Interaction) Logic ---
    const stopMic = useCallback(() => {
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        if (audioInputProcessor) audioInputProcessor.disconnect();
        if (liveSession) stopLiveSession(liveSession);
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

        setMicStream(null);
        setAudioInputProcessor(null);
        setLiveSession(null);
        setIsListening(false);
        setCurrentInputTranscription('');
        setCurrentOutputTranscription('');
        nextStartTimeRef.current = 0;
    }, [micStream, audioInputProcessor, liveSession]);

    const startMic = useCallback(async () => {
        if (isListening) return;

        try {
            setSessionError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicStream(stream);

            const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                if (liveSession) {
                    processAudioChunk(Promise.resolve(liveSession), inputData);
                }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
            setAudioInputProcessor(scriptProcessor);
            
            if (outputAudioContextRef.current?.state === 'suspended') {
                await outputAudioContextRef.current.resume();
            }

            const session = await startLiveSession(
                {
                    onopen: () => setIsListening(true),
                    onmessage: async (message: LiveServerMessage) => {
                        const audioCtx = outputAudioContextRef.current;
                        const outputNode = outputNodeRef.current;
                        if (!audioCtx || !outputNode) return;

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                            const sourceNode = audioCtx.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputNode);
                            sourceNode.addEventListener('ended', () => audioSourcesRef.current.delete(sourceNode));
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(sourceNode);
                        }

                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(source => source.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setSessionError('Live conversation error. Please try again.');
                        stopMic();
                    },
                    onclose: (e: CloseEvent) => stopMic(),
                },
                userProfile,
                currentAnalysis?.medicalData || null,
                (type, text) => {
                    if (type === 'input') setCurrentInputTranscription(prev => prev + text);
                    if (type === 'output') setCurrentOutputTranscription(prev => prev + text);
                },
                () => {
                    if (currentInputTranscription || currentOutputTranscription) {
                        setChatHistory(prev => {
                            const newHistory = [...prev];
                            if (currentInputTranscription) newHistory.push({ role: ChatRole.USER, text: currentInputTranscription });
                            if (currentOutputTranscription) newHistory.push({ role: ChatRole.MODEL, text: currentOutputTranscription });
                            return newHistory;
                        });
                    }
                    setCurrentInputTranscription('');
                    setCurrentOutputTranscription('');
                }
            );
            setLiveSession(session);
        } catch (err: any) {
            console.error('Error starting microphone:', err);
            setSessionError('Failed to access microphone. Please ensure permissions are granted.');
            setIsListening(false);
        }
    }, [isListening, liveSession, userProfile, currentAnalysis, stopMic, currentInputTranscription, currentOutputTranscription]);


    // --- Chat Submission Logic ---
    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() && !attachedImage || isStreaming || isListening) return;

        const newUserMessage: ChatMessage = {
            role: ChatRole.USER,
            text: chatInput,
            imagePreviewUrl: attachedImagePreview || undefined,
        };
        setChatHistory(prev => [...prev, newUserMessage]);
        
        const currentInput = chatInput;
        const currentAttachedImage = attachedImage;
        setChatInput('');
        setAttachedImage(null);
        setAttachedImagePreview(null);
        setIsStreaming(true);

        try {
            let responseText = "";
            let groundingResults: GroundingResult[] | undefined;

            if (activeTab === ActiveTab.SEARCH) {
                const { text, groundingResults: gsResults } = await getGroundedAnswer(currentInput, 'googleSearch');
                responseText = text;
                groundingResults = gsResults;
                setChatHistory(prev => [...prev, { role: ChatRole.MODEL, text: responseText, groundingResults }]);
            } else if (activeTab === ActiveTab.MAPS) {
                if (locationError) {
                    setChatHistory(prev => [...prev, { role: ChatRole.MODEL, text: locationError }]);
                    return;
                }
                const { text, groundingResults: gmResults } = await getGroundedAnswer(currentInput, 'googleMaps', location ?? undefined);
                responseText = text;
                groundingResults = gmResults;
                setChatHistory(prev => [...prev, { role: ChatRole.MODEL, text: responseText, groundingResults }]);
            } else if (currentInput.toLowerCase().startsWith('analyze ingredients:') || useDeepAnalysis) {
                const { text } = await getDeepAnalysis(currentInput, userProfile, currentAnalysis?.medicalData || null);
                responseText = text;
                setChatHistory(prev => [...prev, { role: ChatRole.MODEL, text: responseText }]);
            } else {
                if (!chatInstanceRef.current) {
                    // Fallback to create a session if it doesn't exist.
                    chatInstanceRef.current = createChatSession(chatHistory, userProfile, currentAnalysis?.medicalData);
                }

                const stream = await sendChatMessageStream(chatInstanceRef.current, currentInput, currentAttachedImage);
                setChatHistory(prev => [...prev, { role: ChatRole.MODEL, text: "" }]);
                
                for await (const chunk of stream) {
                    responseText += chunk.text;
                    setChatHistory(prev => {
                        const latestHistory = [...prev];
                        latestHistory[latestHistory.length - 1].text = responseText;
                        return latestHistory;
                    });
                }
            }
        } catch (err: any) {
            setChatHistory(prev => [...prev, { role: ChatRole.MODEL, text: `Sorry, an error occurred: ${err.message}` }]);
        } finally {
            setIsStreaming(false);
        }
    };


    // --- Render Logic ---

    const getTabInfo = () => {
        switch (activeTab) {
            case ActiveTab.SEARCH:
                return {
                    title: "Web Search",
                    description: "Ask me anything! I'll use Google Search to find the most up-to-date information.",
                    placeholder: "e.g., latest skincare trends in 2024"
                };
            case ActiveTab.MAPS:
                return {
                    title: "Find Nearby",
                    description: locationError || "Looking for a dermatologist or a store? Let me know what you're looking for.",
                    placeholder: locationError ? "Please enable location services..." : "e.g., find dermatologists near me"
                };
            case ActiveTab.CHAT:
            default:
                return {
                    title: currentAnalysis ? "Ask About Your Results" : "General Skincare Chat",
                    description: "Feel free to ask follow-up questions or general skincare advice.",
                    placeholder: "Type your question here..."
                };
        }
    };

    const { title, description, placeholder } = getTabInfo();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const triggerFileInput = () => fileInputRef.current?.click();

    const handleAttachedImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setAttachedImage(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const isTextInputDisabled = isStreaming || isListening || (activeTab === ActiveTab.MAPS && !!locationError);
    const isSubmitDisabled = isStreaming || isListening || (!chatInput.trim() && !attachedImage);

    return (
        <div className="card w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col h-[85vh] md:h-[75vh]">
            <div className="text-center mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">{title}</h2>
                <p className="text-sm text-text-light">{description}</p>
                {sessionError && <p className="text-sm text-red-500 mt-1">{sessionError}</p>}
            </div>

            {activeTab === ActiveTab.CHAT && (
                <div className="flex flex-col items-center my-4">
                    <label htmlFor="deep-analysis-toggle" className="flex items-center cursor-pointer mb-2">
                        <div className="relative">
                            <input id="deep-analysis-toggle" type="checkbox" className="sr-only" checked={useDeepAnalysis} onChange={() => setUseDeepAnalysis(!useDeepAnalysis)} />
                            <div className="toggle-switch-bg block w-14 h-8 bg-gray-300 rounded-full transition"></div>
                            <div className="toggle-switch-dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full shadow-md"></div>
                        </div>
                        <div className="ml-3 text-text-secondary font-medium"><i className="fas fa-brain mr-2"></i>Deep Analysis Mode</div>
                    </label>
                    <p className="text-xs text-text-light text-center max-w-sm">Enable for complex questions. Uses a more powerful AI model, but may be slower.</p>
                </div>
            )}
            
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === ChatRole.USER ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md lg:max-w-lg p-3 rounded-2xl shadow-sm ${msg.role === ChatRole.USER ? 'bg-teal-500 text-white rounded-br-none' : 'bg-gray-100 text-text-primary rounded-bl-none'}`}>
                            {msg.imagePreviewUrl && <img src={msg.imagePreviewUrl} alt="Attached" className="mb-2 rounded-lg max-w-[150px] max-h-[150px] object-cover" />}
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}></div>
                            {msg.groundingResults && <GroundingResultDisplay results={msg.groundingResults} />}
                        </div>
                    </div>
                ))}
                {isListening && (
                    <>
                        {currentInputTranscription && <div className="flex justify-end"><div className="max-w-md p-3 rounded-2xl bg-teal-500 text-white rounded-br-none opacity-80">{currentInputTranscription}<span className="animate-pulse">...</span></div></div>}
                        {currentOutputTranscription && <div className="flex justify-start"><div className="max-w-md p-3 rounded-2xl bg-gray-100 text-text-primary rounded-bl-none opacity-80">{currentOutputTranscription}<span className="animate-pulse">...</span></div></div>}
                    </>
                )}
            </div>

            <form onSubmit={handleChatSubmit} className="flex items-center border-t pt-4 relative">
                {attachedImagePreview && (
                    <div className="absolute -top-16 left-0 flex items-center bg-gray-100 p-2 rounded-lg shadow-md">
                        <img src={attachedImagePreview} alt="Attached" className="w-10 h-10 object-cover rounded-md mr-2" />
                        <button type="button" onClick={() => { setAttachedImage(null); setAttachedImagePreview(null); }} className="ml-2 text-red-500 hover:text-red-700"><i className="fas fa-times-circle"></i></button>
                    </div>
                )}
                <button type="button" onClick={triggerFileInput} className="p-3 text-text-light hover:text-brand-primary disabled:opacity-50" disabled={isTextInputDisabled} title="Attach Image"><i className="fas fa-image text-xl"></i></button>
                <input type="file" ref={fileInputRef} onChange={handleAttachedImageChange} accept="image/*" className="hidden" disabled={isTextInputDisabled} />
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={placeholder} className="form-input flex-grow rounded-r-none" disabled={isTextInputDisabled} />
                <button type="button" onClick={isListening ? stopMic : startMic} className={`p-3 text-white transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:bg-gray-400`} disabled={isStreaming} title={isListening ? 'Stop Listening' : 'Start Voice Chat'}>
                    <i className={`fas ${isListening ? 'fa-stop-circle animate-pulse' : 'fa-microphone'}`}></i>
                </button>
                <button type="submit" className="bg-brand-primary text-white p-3 rounded-r-lg hover:bg-brand-primary-dark disabled:bg-gray-400" disabled={isSubmitDisabled}><i className="fas fa-paper-plane"></i></button>
            </form>
        </div>
    );
}

export default ChatScreen;
