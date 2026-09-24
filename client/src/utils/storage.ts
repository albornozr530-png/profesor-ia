import { StudentProfile, ExerciseReviewResult, QuizResult, StudyNote, ChatMessage, FlashcardDeck } from '../types';

const PROFILE_KEY = 'profesor_ia_current_profile';
const ALL_PROFILES_KEY = 'profesor_ia_all_profiles';
const REVIEWS_KEY = 'profesor_ia_reviews';
const QUIZZES_KEY = 'profesor_ia_quizzes';
const NOTES_KEY = 'profesor_ia_notes';
const FLASHCARDS_KEY = 'profesor_ia_flashcards';
const CHAT_KEY_PREFIX = 'profesor_ia_chat_';

const VALID_LEVELS = new Set(['primaria', 'secundaria', 'universidad', 'posgrado', 'autodidacta']);
const VALID_AUTH_METHODS = new Set(['google', 'phone', 'guest']);

function scopedKey(base: string, profileId?: string): string {
  return profileId ? `${base}_${encodeURIComponent(profileId)}` : base;
}

function readList<T extends { id?: string }>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is T => Boolean(item && typeof item === 'object' && typeof (item as T).id === 'string'))
      : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, values: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch (error) {
    console.error('Error saving data to storage:', error);
  }
}

/**
 * Valida y normaliza perfiles guardados por versiones anteriores.
 * Una edad ausente o inválida se descarta; nunca se sustituye por 15 porque
 * eso haría que el tutor usara una edad falsa.
 */
function normalizeProfile(value: unknown): StudentProfile | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StudentProfile>;
  const age = Number(candidate.age);
  if (
    !candidate.id ||
    !candidate.name ||
    !Number.isInteger(age) ||
    age < 5 ||
    age > 100 ||
    !candidate.level ||
    !VALID_LEVELS.has(candidate.level) ||
    !candidate.authMethod ||
    !VALID_AUTH_METHODS.has(candidate.authMethod)
  ) {
    return null;
  }

  return {
    id: String(candidate.id),
    name: String(candidate.name),
    email: candidate.email ? String(candidate.email) : undefined,
    phone: candidate.phone ? String(candidate.phone) : undefined,
    authMethod: candidate.authMethod,
    age,
    ageConfirmed: candidate.ageConfirmed === true,
    level: candidate.level,
    career: candidate.career ? String(candidate.career) : undefined,
    semester: candidate.semester ? String(candidate.semester) : undefined,
    subject: String(candidate.subject || 'Aprendizaje General'),
    objective: candidate.objective ? String(candidate.objective) : undefined,
    avatarSeed: String(candidate.avatarSeed || candidate.name || 'Tutor'),
    createdAt: String(candidate.createdAt || new Date().toISOString()),
  };
}

export function getStoredProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveStoredProfile(profile: StudentProfile): boolean {
  try {
    const normalized = normalizeProfile(profile);
    if (!normalized) {
      console.warn('No se guardó un perfil con edad o datos inválidos.');
      return false;
    }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    const all = getAllStoredProfiles();
    const index = all.findIndex((p) => p.id === normalized.id);
    if (index >= 0) all[index] = normalized;
    else all.push(normalized);
    localStorage.setItem(ALL_PROFILES_KEY, JSON.stringify(all));
    return true;
  } catch (error) {
    console.error('Error saving profile to storage:', error);
    return false;
  }
}

export function getAllStoredProfiles(): StudentProfile[] {
  return readList<Partial<StudentProfile>>(ALL_PROFILES_KEY)
    .map(normalizeProfile)
    .filter((profile): profile is StudentProfile => profile !== null);
}

export function removeStoredProfile(id: string): void {
  try {
    const all = getAllStoredProfiles().filter((p) => p.id !== id);
    localStorage.setItem(ALL_PROFILES_KEY, JSON.stringify(all));
    if (getStoredProfile()?.id === id) localStorage.removeItem(PROFILE_KEY);

    for (const base of [REVIEWS_KEY, QUIZZES_KEY, NOTES_KEY, FLASHCARDS_KEY]) {
      localStorage.removeItem(scopedKey(base, id));
    }
    const chatPrefix = `${CHAT_KEY_PREFIX}${id}_`;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(chatPrefix)) localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Error removing profile:', error);
  }
}

// Historiales separados por perfil. La firma opcional conserva compatibilidad
// con datos antiguos y permite migrarlos en una siguiente versión.
export function getStoredReviews(profileId?: string): ExerciseReviewResult[] {
  return readList<ExerciseReviewResult>(scopedKey(REVIEWS_KEY, profileId));
}

export function saveReviewResult(review: ExerciseReviewResult, profileId?: string): void {
  const value = profileId ? { ...review, profileId } : review;
  const key = scopedKey(REVIEWS_KEY, profileId || value.profileId);
  const existing = readList<ExerciseReviewResult>(key);
  writeList(key, [value, ...existing.filter((item) => item.id !== value.id)].slice(0, 50));
}

export function getStoredQuizzes(profileId?: string): QuizResult[] {
  return readList<QuizResult>(scopedKey(QUIZZES_KEY, profileId));
}

export function saveQuizResult(quiz: QuizResult, profileId?: string): void {
  const value = profileId ? { ...quiz, profileId } : quiz;
  const key = scopedKey(QUIZZES_KEY, profileId || value.profileId);
  const existing = readList<QuizResult>(key);
  writeList(key, [value, ...existing.filter((item) => item.id !== value.id)].slice(0, 50));
}

export function getStoredNotes(profileId?: string): StudyNote[] {
  return readList<StudyNote>(scopedKey(NOTES_KEY, profileId));
}

export function saveStudyNote(note: StudyNote, profileId?: string): void {
  const value = profileId ? { ...note, profileId } : note;
  const key = scopedKey(NOTES_KEY, profileId || value.profileId);
  const existing = readList<StudyNote>(key);
  writeList(key, [value, ...existing.filter((item) => item.id !== value.id)].slice(0, 50));
}

export function getStoredFlashcardDecks(profileId?: string): FlashcardDeck[] {
  return readList<FlashcardDeck>(scopedKey(FLASHCARDS_KEY, profileId));
}

export function saveFlashcardDeck(deck: FlashcardDeck, profileId?: string): void {
  const value = profileId ? { ...deck, profileId } : deck;
  const key = scopedKey(FLASHCARDS_KEY, profileId || value.profileId);
  const existing = readList<FlashcardDeck>(key);
  writeList(key, [value, ...existing.filter((item) => item.id !== value.id)].slice(0, 50));
}

export function deleteFlashcardDeck(deckId: string, profileId?: string): void {
  const key = scopedKey(FLASHCARDS_KEY, profileId);
  writeList(key, readList<FlashcardDeck>(key).filter((deck) => deck.id !== deckId));
}

export function getStoredChat(profileId: string, subject: string): ChatMessage[] {
  try {
    const key = `${CHAT_KEY_PREFIX}${profileId}_${encodeURIComponent(subject)}`;
    return readList<ChatMessage>(key);
  } catch {
    return [];
  }
}

export function saveStoredChat(profileId: string, subject: string, messages: ChatMessage[]): void {
  try {
    const key = `${CHAT_KEY_PREFIX}${profileId}_${encodeURIComponent(subject)}`;
    localStorage.setItem(key, JSON.stringify(messages.slice(-60)));
  } catch (error) {
    console.error('Error saving chat:', error);
  }
}
