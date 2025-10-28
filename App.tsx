import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { RoutineModal } from './components/RoutineModal';
import { ImageComparisonModal } from './components/ImageComparisonModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Loader } from './components/Loader';
import ErrorBoundary from './components/ErrorBoundary';
import { generateSkincareRoutine } from './services/geminiService';
import { SkincareAnalysis, ActiveTab, AnalysisRecord, UserProfile, RoutinePreferences, ChatMessage, ChatRole, MedicalQuestionnaireData, CartItem, ShoppingProduct } from './types';

// Lazy load screen components for better initial load performance
const AnalyzeScreen = lazy(() => import('./components/AnalyzeScreen'));
const ChatScreen = lazy(() => import('./components/ChatScreen'));
const JourneyScreen = lazy(() => import('./components/JourneyScreen'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));
const StoreScreen = lazy(() => import('./components/StoreScreen'));


declare var marked: { parse: (text: string) => string };

// Define props for the new standalone TabButton component
interface TabButtonProps {
    tab: ActiveTab;
    iconClass: string;
    activeTab: ActiveTab;
    cart: CartItem[];
    isDisabled: boolean;
    onClick: (tab: ActiveTab) => void;
}

// Extract TabButton into a memoized standalone component for performance and a11y
const TabButton: React.FC<TabButtonProps> = React.memo(({ tab, iconClass, activeTab, cart, isDisabled, onClick }) => {
    const isStoreTab = tab === ActiveTab.STORE;
    const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

    return (
        <button
            onClick={() => onClick(tab)}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            disabled={isDisabled && !isStoreTab}
            aria-selected={activeTab === tab}
            role="tab"
        >
            <i className={`fas ${iconClass} mr-2 hidden sm:inline-block`}></i>{tab}
            {isStoreTab && cartItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold" aria-label={`${cartItemCount} items in cart`}>
                    {cartItemCount}
                </span>
            )}
        </button>
    );
});
TabButton.displayName = 'TabButton'; // For better debugging


export default function App() {
    const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.ANALYZE);
    
    // Global State
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]);
    const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisRecord | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);


    // Modal States
    const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
    const [generatedRoutine, setGeneratedRoutine] = useState('');
    const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
    const [imagesToCompare, setImagesToCompare] = useState<AnalysisRecord[]>([]);
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);


    // --- Global State Management & Persistence ---

    // Load state from localStorage on initial render
    useEffect(() => {
        // Onboarding check
        const hasOnboarded = localStorage.getItem('dermaGenius-hasOnboarded');
        if (!hasOnboarded) {
            setShowOnboarding(true);
        }

        try {
            const savedHistory = localStorage.getItem('dermaGenius-analysisHistory');
            const savedChat = localStorage.getItem('dermaGenius-chatHistory');
            const savedProfile = localStorage.getItem('dermaGenius-userProfile');
            const savedCurrentAnalysis = localStorage.getItem('dermaGenius-currentAnalysis');
            const savedCart = localStorage.getItem('dermaGenius-cart');

            if (savedHistory) {
                const parsedHistory: AnalysisRecord[] = JSON.parse(savedHistory);
                setAnalysisHistory(parsedHistory);
            }
             if (savedCurrentAnalysis) {
                const parsedCurrentAnalysis: AnalysisRecord = JSON.parse(savedCurrentAnalysis);
                setCurrentAnalysis(parsedCurrentAnalysis);
            }
            if (savedChat) {
                const parsedChat: ChatMessage[] = JSON.parse(savedChat);
                setChatHistory(parsedChat);
            }
            if (savedProfile) {
                const parsedProfile: UserProfile = JSON.parse(savedProfile);
                setUserProfile(parsedProfile);
            }
            if (savedCart) {
                const parsedCart: CartItem[] = JSON.parse(savedCart);
                setCart(parsedCart);
            }
        } catch (e) { console.error("Failed to load state from localStorage", e); }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('dermaGenius-analysisHistory', JSON.stringify(analysisHistory));
            localStorage.setItem('dermaGenius-chatHistory', JSON.stringify(chatHistory));
            localStorage.setItem('dermaGenius-cart', JSON.stringify(cart));
            if (userProfile) {
                localStorage.setItem('dermaGenius-userProfile', JSON.stringify(userProfile));
            } else {
                 localStorage.removeItem('dermaGenius-userProfile');
            }
            if (currentAnalysis) {
                localStorage.setItem('dermaGenius-currentAnalysis', JSON.stringify(currentAnalysis));
            } else {
                localStorage.removeItem('dermaGenius-currentAnalysis');
            }

        } catch (e) { console.error("Failed to save state to localStorage", e); }
    }, [analysisHistory, chatHistory, userProfile, currentAnalysis, cart]);

     // Geolocation for Maps tab
    useEffect(() => {
        if (!location && !locationError) {
            navigator.geolocation.getCurrentPosition(
                (position) => setLocation(position.coords),
                (err) => setLocationError(`Location access denied: ${err.message}. Enable location services to use this feature.`)
            );
        }
    }, [location, locationError]);


    // --- Handlers for Child Components ---

    const handleAnalysisSuccess = (newRecord: AnalysisRecord) => {
        setAnalysisHistory(prev => [...prev, newRecord]);
        setCurrentAnalysis(newRecord);

        // Create an initial chat message to guide the user when they navigate to the chat tab
        const initialMessageText = `Hello! I've analyzed your skin and here's a summary of my findings:\n\n*${newRecord.analysis.summary}*\n\nBased on this, I've identified ${newRecord.analysis.concerns.length} concern(s) and have found several product options for you to consider on the 'Analyze' tab. What would you like to discuss first?`;
        const initialHistory: ChatMessage[] = [{ role: ChatRole.MODEL, text: initialMessageText }];
        setChatHistory(initialHistory);
        
        // Let the user stay on the Analysis screen to see the results. They can navigate to chat when ready.
    };
    
    const handleGenerateRoutine = useCallback(async (analysis: SkincareAnalysis, preferences: RoutinePreferences, medicalData: MedicalQuestionnaireData | null) => {
        setIsRoutineModalOpen(true);
        setIsGeneratingRoutine(true);
        setGeneratedRoutine('');
        try {
            const routineText = await generateSkincareRoutine(analysis, preferences, userProfile, medicalData);
            setGeneratedRoutine(marked.parse(routineText));
        } catch (err: any) {
            setGeneratedRoutine(`<p class="text-red-500">Sorry, I couldn't generate a routine. Error: ${err.message}</p>`);
        } finally {
            setIsGeneratingRoutine(false);
        }
    }, [userProfile]);

    const handleSelectAnalysisFromJourney = (record: AnalysisRecord) => {
        setCurrentAnalysis(record);
        const initialMessageText = `We are now discussing your analysis from ${new Date(record.date).toLocaleDateString()}.\n\nHere's a summary of those findings:\n\n*${record.analysis.summary}*\n\nHow can I help you with this analysis?`;
        const initialHistory: ChatMessage[] = [{ role: ChatRole.MODEL, text: initialMessageText }];
        setChatHistory(initialHistory);
        setActiveTab(ActiveTab.CHAT);
    };

    const handleCompareImages = (records: AnalysisRecord[]) => {
        setImagesToCompare(records);
        setIsComparisonModalOpen(true);
    };

    const handleClearAllHistory = () => {
        setAnalysisHistory([]);
        setChatHistory([]);
        setCurrentAnalysis(null);
        setCart([]);
        setActiveTab(ActiveTab.ANALYZE);
    };

    // --- Cart Handlers ---
    const handleAddToCart = (product: ShoppingProduct) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.shoppingUrl === product.shoppingUrl);
            if (existingItem) {
                return prevCart.map(item =>
                    item.shoppingUrl === product.shoppingUrl
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const handleUpdateCartQuantity = (shoppingUrl: string, quantity: number) => {
        setCart(prevCart =>
            prevCart.map(item =>
                item.shoppingUrl === shoppingUrl ? { ...item, quantity } : item
            ).filter(item => item.quantity > 0)
        );
    };

    const handleRemoveFromCart = (shoppingUrl: string) => {
        setCart(prevCart => prevCart.filter(item => item.shoppingUrl !== shoppingUrl));
    };

    const handleClearCart = () => {
        setCart([]);
    };
    
    const handleOnboardingFinish = () => {
        setShowOnboarding(false);
        localStorage.setItem('dermaGenius-hasOnboarded', 'true');
    };

    return (
        <div className="min-h-screen">
            <Header />
            <main className="main-container">
                <div className="w-full max-w-4xl mx-auto mb-6">
                    <nav className="tab-nav" role="tablist">
                        <TabButton tab={ActiveTab.ANALYZE} iconClass="fa-camera-retro" activeTab={activeTab} cart={cart} isDisabled={false} onClick={setActiveTab} />
                        <TabButton tab={ActiveTab.JOURNEY} iconClass="fa-book-open" activeTab={activeTab} cart={cart} isDisabled={analysisHistory.length === 0} onClick={setActiveTab} />
                        <TabButton tab={ActiveTab.CHAT} iconClass="fa-comments" activeTab={activeTab} cart={cart} isDisabled={!currentAnalysis} onClick={setActiveTab} />
                        <TabButton tab={ActiveTab.STORE} iconClass="fa-shopping-cart" activeTab={activeTab} cart={cart} isDisabled={false} onClick={setActiveTab} />
                        <TabButton tab={ActiveTab.PROFILE} iconClass="fa-user-circle" activeTab={activeTab} cart={cart} isDisabled={false} onClick={setActiveTab} />
                    </nav>
                </div>

                <ErrorBoundary>
                    <Suspense fallback={<Loader message="Loading page..." />}>
                        <div className="fade-in">
                            {/* Render the active screen component */}
                            {activeTab === ActiveTab.ANALYZE && (
                                <AnalyzeScreen
                                    onAnalysisSuccess={handleAnalysisSuccess}
                                    onGenerateRoutineRequest={handleGenerateRoutine}
                                    onClearAllHistory={handleClearAllHistory}
                                    analysisHistoryCount={analysisHistory.length}
                                    onAddToCart={handleAddToCart}
                                />
                            )}
                            {activeTab === ActiveTab.JOURNEY && (
                                <JourneyScreen
                                    analysisHistory={analysisHistory}
                                    onSelectAnalysis={handleSelectAnalysisFromJourney}
                                    onCompareImages={handleCompareImages}
                                />
                            )}
                            {(activeTab === ActiveTab.CHAT || activeTab === ActiveTab.SEARCH || activeTab === ActiveTab.MAPS) && currentAnalysis && (
                                <ChatScreen
                                    key={currentAnalysis.date} // Force re-mount when analysis changes
                                    activeTab={activeTab}
                                    currentAnalysis={currentAnalysis}
                                    userProfile={userProfile}
                                    initialChatHistory={chatHistory}
                                    onChatHistoryUpdate={setChatHistory}
                                    location={location}
                                    locationError={locationError}
                                />
                            )}
                            {activeTab === ActiveTab.STORE && (
                                <StoreScreen
                                    cart={cart}
                                    onUpdateQuantity={handleUpdateCartQuantity}
                                    onRemoveItem={handleRemoveFromCart}
                                    onClearCart={handleClearCart}
                                />
                            )}
                            {activeTab === ActiveTab.PROFILE && (
                                <ProfileScreen
                                    userProfile={userProfile}
                                    setUserProfile={setUserProfile}
                                />
                            )}
                        </div>
                    </Suspense>
                </ErrorBoundary>
            </main>
            
            <RoutineModal
                isOpen={isRoutineModalOpen}
                onClose={() => setIsRoutineModalOpen(false)}
                routineHtml={generatedRoutine}
                isLoading={isGeneratingRoutine}
            />
            <ImageComparisonModal
                isOpen={isComparisonModalOpen}
                onClose={() => setIsComparisonModalOpen(false)}
                images={imagesToCompare.map(record => ({ src: record.imageB64 || '', date: record.date }))}
            />
            <OnboardingModal
                isOpen={showOnboarding}
                onFinish={handleOnboardingFinish}
            />
        </div>
    );
}