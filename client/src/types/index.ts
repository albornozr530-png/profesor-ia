export type AcademicLevel = 'primaria' | 'secundaria' | 'universidad' | 'posgrado' | 'autodidacta';

export interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  authMethod: 'google' | 'phone' | 'guest';
  age: number;
  /** false en perfiles antiguos: se pide confirmarla una vez. */
  ageConfirmed?: boolean;
  level: AcademicLevel;
  // Specific to Universidad / Posgrado
  career?: string;
  semester?: string;
  // Current subject focus
  subject: string;
  // For autodidacta
  objective?: string;
  avatarSeed: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; uri: string; snippet?: string }>;
}

export interface ExerciseReviewResult {
  id: string;
  profileId?: string;
  timestamp: string;
  exerciseStatement: string;
  studentWork: string;
  status: 'correct' | 'partially_correct' | 'needs_work';
  summary: string;
  identifiedMistake?: string | null;
  stepByStep: string[];
  pedagogicalExplanation: string;
  encouragement: string;
  suggestedPractice?: string;
  subject: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  tip: string;
}

export interface QuizResult {
  id: string;
  profileId?: string;
  title: string;
  topic: string;
  subject: string;
  level: AcademicLevel;
  questions: QuizQuestion[];
  userAnswers: number[];
  score: number;
  total: number;
  timestamp: string;
}

export interface StudyNote {
  id: string;
  profileId?: string;
  topic: string;
  subject: string;
  title: string;
  summary: string;
  keyPoints: string[];
  practicalExample: string;
  memoryTrick: string;
  commonMistakeToAvoid?: string;
  timestamp: string;
}

export type MasteryRating = 'needs_practice' | 'good' | 'mastered';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  userMastery?: MasteryRating;
}

export interface FlashcardDeck {
  id: string;
  profileId?: string;
  title: string;
  topic: string;
  subject: string;
  level: AcademicLevel;
  cards: Flashcard[];
  createdAt: string;
  lastTestedAt?: string;
  timesTested?: number;
}
