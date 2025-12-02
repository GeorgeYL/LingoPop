export enum ViewState {
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  RESULT = 'RESULT',
  NOTEBOOK = 'NOTEBOOK',
  STORY = 'STORY',
  FLASHCARDS = 'FLASHCARDS'
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface Example {
  target: string;
  native: string;
}

export interface DictionaryEntry {
  id: string; // unique ID for React keys
  term: string;
  phonetic?: string; // Derived or generated
  definition: string;
  examples: Example[];
  usageGuide: string;
  imageUrl?: string; // Base64
  savedAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StoryResult {
  title: string;
  content: string;
}