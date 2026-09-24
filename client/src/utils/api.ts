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

/**
 * Chat con escritura en vivo: el profesor "escribe" la respuesta en tiempo
 * real vía SSE. onDelta se llama con cada fragmento de texto; devuelve el
 * texto completo y las fuentes consultadas.
 */
export async function streamChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  profile: StudentProfile,
  useSearch: boolean = false,
  onDelta?: (chunk: string) => void,
  onSources?: (sources: Array<{ title: string; uri: string; snippet?: string }>) => void
): Promise<ChatResponse> {
  const response = await fetch(apiUrl('/api/tutor/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, profile, useSearch }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error del servidor (${response.status})`);
  }
  if (!response.body) throw new Error('El servidor no devolvió stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let sources: ChatResponse['sources'] = [];
  let streamError: string | null = null;
  let finalText: string | null = null;

  const processEvent = (event: string, data: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (event === 'sources') {
      sources = parsed.sources || [];
      onSources?.(sources);
    } else if (event === 'delta') {
      full += parsed.text || '';
      onDelta?.(parsed.text || '');
    } else if (event === 'final') {
      // Versión limpia final (sin símbolos de Markdown) enviada por el servidor.
      if (typeof parsed.text === 'string' && parsed.text) finalText = parsed.text;
    } else if (event === 'error') {
      streamError = parsed.error || 'Error del motor de IA';
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Los eventos SSE terminan con doble salto de línea.
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const rawEvent of events) {
      let event = 'message';
      let dataLines: string[] = [];
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) processEvent(event, dataLines.join('\n'));
    }
  }

  if (streamError && !full) throw new Error(streamError);
  if (!full && !streamError) throw new Error('La respuesta del profesor llegó vacía. Intenta de nuevo.');
  return { text: finalText || full, sources };
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
