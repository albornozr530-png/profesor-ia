import { Capacitor } from '@capacitor/core';
import { StudentProfile, ExerciseReviewResult, QuizQuestion, StudyNote } from '../types';

const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
// En un dispositivo Android el `localhost` sería el propio teléfono. 10.0.2.2
// apunta al host del emulador; para un teléfono físico se debe configurar
// VITE_API_BASE_URL con una URL HTTPS del servidor.
export const API_BASE_URL = configuredBase || (Capacitor.isNativePlatform() ? 'http://10.0.2.2:3001' : '');

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, options: RequestInit = {}, timeoutMs = 100_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error del servidor (${response.status})`);
    }
    return await response.json() as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('La solicitud tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export interface ChatResponse {
  text: string;
  sources?: Array<{ title: string; uri: string; snippet?: string }>;
}

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  profile: StudentProfile,
  useSearch: boolean = false
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/api/tutor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, profile, useSearch }),
  });
}

export async function requestExerciseReview(
  exerciseStatement: string,
  studentWork: string,
  profile: StudentProfile
): Promise<Omit<ExerciseReviewResult, 'id' | 'timestamp' | 'subject'>> {
  return apiRequest('/api/tutor/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciseStatement, studentWork, profile }),
  });
}

export interface QuizApiResponse {
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

export async function requestQuiz(
  topic: string,
  profile: StudentProfile,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<QuizApiResponse> {
  return apiRequest('/api/tutor/generate-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, profile, difficulty, count: 4 }),
  });
}

export async function requestStudyNotes(
  topic: string,
  profile: StudentProfile
): Promise<Omit<StudyNote, 'id' | 'timestamp' | 'subject'>> {
  return apiRequest('/api/tutor/summary-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, profile }),
  });
}

export interface FlashcardsApiResponse {
  title: string;
  cards: Array<{
    front: string;
    back: string;
    hint?: string;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
}

export async function requestFlashcards(
  topic: string,
  profile: StudentProfile,
  noteContext?: string,
  count: number = 6
): Promise<FlashcardsApiResponse> {
  return apiRequest('/api/tutor/generate-flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, profile, noteContext, count }),
  });
}

export async function transcribeAudioBlob(blob: Blob, language = 'es'): Promise<{ text: string; language?: string }> {
  return apiRequest(`/api/speech/transcribe?language=${encodeURIComponent(language)}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'audio/webm' },
    body: blob,
  }, 100_000);
}
