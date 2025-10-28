
export interface SkinConcern {
  concern: string;
  description: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
}

export interface Product {
  name: string;
  brand: string;
  type: 'Cleanser' | 'Moisturizer' | 'Serum' | 'Sunscreen' | 'Toner' | 'Treatment';
  reason: string;
}

export interface ShoppingProduct extends Product {
  shoppingUrl: string;
  imageUrl: string;
  price: string;
  rating: number;
  reviewCount: number;
  merchant: string;
}

export interface CartItem extends ShoppingProduct {
  quantity: number;
}

export interface MedicalQuestionnaireData {
  medicalHistory?: string;
  currentMedications?: string;
  concomitantMedications?: string;
  signsSymptoms?: string;
  labWork?: string;
  recentVaccinations?: string;
}

export interface AnalysisRecord {
    date: string;
    analysis: SkincareAnalysis;
    imageB64?: string; // Added for visual progress tracking
    medicalData?: MedicalQuestionnaireData; // Added for comprehensive analysis context
}

export interface DifferentialDiagnosis {
  condition: string;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

export interface SkincareAnalysis {
  concerns: SkinConcern[];
  recommendations: Product[];
  summary: string;
  potentialCauses?: string; // New: AI's inference on causes
  importantConsiderations?: string; // New: AI's safety/interaction advice
  // New fields for "SkinGPT-4" style Advanced Diagnosis
  differentialDiagnosis?: DifferentialDiagnosis[];
  recommendedTests?: string;
  confidenceScore?: number;
}

export enum ChatRole {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
  groundingResults?: GroundingResult[];
  imagePreviewUrl?: string; // Added for multimodal chat display
}

export interface WebGrounding {
  uri: string;
  title: string;
}

export interface MapsGrounding {
  uri: string;
  title: string;
  placeAnswerSources?: { reviewSnippets: { text: string }[] }
}

export interface GroundingResult {
  web?: WebGrounding;
  maps?: MapsGrounding;
}

export enum ActiveTab {
    ANALYZE = 'Analyze',
    JOURNEY = 'Journey',
    CHAT = 'Chat',
    SEARCH = 'Search',
    MAPS = 'Maps',
    STORE = 'Store',
    PROFILE = 'Profile',
}

export interface UserProfile {
  skinType: string;
  allergies: string[];
  goals: string;
}

export interface RoutinePreferences {
  intensity: 'gentle' | 'standard' | 'intensive';
  timeCommitment: 'quick' | 'detailed';
}

// New type for the dermatologist finder feature
export interface Dermatologist {
    name: string;
    address: string;
    phone?: string;
    mapsUri: string;
}


// Types for Live API audio processing
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

export type MediaRecorder = any; // Simplify for now
export type AudioContext = any; // Simplify for now
export type MediaStream = any; // Simplify for now