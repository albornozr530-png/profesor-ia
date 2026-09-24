import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RotateCw,
  Volume2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Layers,
  BookOpen,
  ArrowRight,
  Trash2,
  VolumeX,
  Target,
  BrainCircuit,
  GraduationCap,
  Play
} from 'lucide-react';
import { StudentProfile, Flashcard, FlashcardDeck, MasteryRating } from '../types';
import { requestFlashcards } from '../utils/api';
import { getStoredFlashcardDecks, saveFlashcardDeck, deleteFlashcardDeck } from '../utils/storage';

interface InteractiveFlashcardsProps {
  profile: StudentProfile;
  initialTopic?: string;
  initialNoteContext?: string;
  onBackToNotes?: () => void;
}

export const InteractiveFlashcards: React.FC<InteractiveFlashcardsProps> = ({
  profile,
  initialTopic,
  initialNoteContext,
  onBackToNotes,
}) => {
  const [topic, setTopic] = useState<string>(initialTopic || profile.subject || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null);
  const [savedDecks, setSavedDecks] = useState<FlashcardDeck[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [onlyDifficult, setOnlyDifficult] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Load saved decks from storage
  useEffect(() => {
    const decks = getStoredFlashcardDecks(profile.id);
    setSavedDecks(decks);
    setCurrentDeck(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setTopic(initialTopic || profile.subject || '');
  }, [profile.id, profile.subject, initialTopic]);

  // Active cards based on filter
  const activeCards: Flashcard[] = React.useMemo(() => {
    if (!currentDeck) return [];
    if (onlyDifficult) {
      const filtered = currentDeck.cards.filter((c) => c.userMastery === 'needs_practice');
      return filtered.length > 0 ? filtered : currentDeck.cards;
    }
    return currentDeck.cards;
  }, [currentDeck, onlyDifficult]);

  const currentCard: Flashcard | undefined = activeCards[currentIndex];

  // Reset card state when index changes
  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentIndex, currentDeck]);

  // Handle generation of new flashcards
  const handleGenerate = async (customTopic?: string, customContext?: string) => {
    const targetTopic = (customTopic || topic).trim();
    if (!targetTopic && !customContext) return;

    setIsGenerating(true);
    setIsFinished(false);
    setCurrentIndex(0);
    setIsFlipped(false);

    try {
      const res = await requestFlashcards(
        targetTopic || profile.subject || 'Conceptos clave',
        profile,
        customContext || initialNoteContext,
        6
      );

      const newDeck: FlashcardDeck = {
        id: `deck_${Date.now()}`,
        profileId: profile.id,
        title: res.title || `Flashcards: ${targetTopic}`,
        topic: targetTopic,
        subject: profile.subject || 'General',
        level: profile.level,
        cards: res.cards.map((c, i) => ({
          id: `card_${Date.now()}_${i}`,
          front: c.front,
          back: c.back,
          hint: c.hint,
          category: c.category || 'Concepto Clave',
          difficulty: c.difficulty || 'medium',
          userMastery: undefined,
        })),
        createdAt: new Date().toISOString(),
        timesTested: 0,
      };

      setCurrentDeck(newDeck);
      saveFlashcardDeck(newDeck, profile.id);
      setSavedDecks((prev) => [newDeck, ...prev.filter((d) => d.id !== newDeck.id)]);
    } catch (err: any) {
      console.error('Error generando flashcards:', err);
      alert('Hubo un inconveniente al generar las flashcards. Por favor, reintenta.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (!currentDeck || isFinished) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === '1' && isFlipped) {
        handleRate('needs_practice');
      } else if (e.key === '2' && isFlipped) {
        handleRate('good');
      } else if (e.key === '3' && isFlipped) {
        handleRate('mastered');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDeck, isFinished, isFlipped, currentIndex, activeCards]);

  const handleNext = () => {
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      // Update deck stats
      if (currentDeck) {
        const updatedDeck = {
          ...currentDeck,
          lastTestedAt: new Date().toISOString(),
          timesTested: (currentDeck.timesTested || 0) + 1,
        };
        setCurrentDeck(updatedDeck);
        saveFlashcardDeck(updatedDeck, profile.id);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRate = (rating: MasteryRating) => {
    if (!currentDeck || !currentCard) return;

    const updatedCards = currentDeck.cards.map((c) =>
      c.id === currentCard.id ? { ...c, userMastery: rating } : c
    );

    const updatedDeck: FlashcardDeck = {
      ...currentDeck,
      cards: updatedCards,
    };

    setCurrentDeck(updatedDeck);
    saveFlashcardDeck(updatedDeck, profile.id);

    // Auto advance
    handleNext();
  };

  const handleShuffle = () => {
    if (!currentDeck) return;
    const shuffled = [...currentDeck.cards].sort(() => Math.random() - 0.5);
    setCurrentDeck({
      ...currentDeck,
      cards: shuffled,
    });
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Tu navegador no soporta síntesis de voz.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleDeleteDeck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este mazo de flashcards?')) {
      deleteFlashcardDeck(id, profile.id);
      setSavedDecks((prev) => prev.filter((d) => d.id !== id));
      if (currentDeck?.id === id) {
        setCurrentDeck(null);
      }
    }
  };

  // Calculate statistics
  const masteredCount = currentDeck?.cards.filter((c) => c.userMastery === 'mastered').length || 0;
  const goodCount = currentDeck?.cards.filter((c) => c.userMastery === 'good').length || 0;
  const needsPracticeCount = currentDeck?.cards.filter((c) => c.userMastery === 'needs_practice').length || 0;
  const totalCards = currentDeck?.cards.length || 0;
  const masteryPercentage = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  // Level-based topic suggestions
  const suggestions = React.useMemo(() => {
    switch (profile.level) {
      case 'primaria':
        return ['Partes de la planta y fotosíntesis', 'Tablas de multiplicar del 6 al 9', 'Cadena alimenticia', 'Estados del agua'];
      case 'secundaria':
        return ['Leyes de Newton', 'Mitosis vs Meiosis', 'Ecuaciones cuadráticas y fórmula general', 'Causas de la Primera Guerra Mundial'];
      case 'universidad':
        return [
          profile.career ? `${profile.career}: Principios Fundamentales` : 'Mecanismo de acción farmacológica',
          'Diagnóstico diferencial y signos clínicos',
          'Teorema central del límite y distribuciones',
          'Estructura de datos y grafos'
        ];
      case 'posgrado':
        return ['Metodología de diseño experimental', 'Mecanismos fisiopatológicos moleculares', 'Epistemología y contrastación de hipótesis'];
      default:
        return ['Principios clave de estudio', 'Resolución de problemas paso a paso', 'Técnicas de memoria activa'];
    }
  }, [profile]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-800 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-200 text-xs font-bold uppercase tracking-wider mb-1">
            <BrainCircuit className="w-4 h-4" />
            <span>Recuerdo Activo & Repetición Espaciada</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Flashcards Interactivas de Autoevaluación
          </h2>
          <p className="text-xs sm:text-sm text-violet-100 mt-1 max-w-xl">
            Convierte temas complejos en tarjetas de estudio con preguntas desafiantes, pistas pedagógicas y sistema de calificación de dominio.
          </p>
        </div>

        {onBackToNotes && (
          <button
            type="button"
            onClick={onBackToNotes}
            className="self-start sm:self-center px-4 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition flex items-center gap-1.5 shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            <span>Volver a Apuntes</span>
          </button>
        )}
      </div>

      {/* Generator Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          ¿Qué tema complejo deseas dominar con Flashcards de autoevaluación?
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGenerate();
            }}
            placeholder="Ej: Fisiopatología del Shock, Leyes de Kirchhoff, Reglas de Acentuación, Derivadas Parciales..."
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-900 dark:text-white"
          />
          <button
            type="button"
            disabled={!topic.trim() || isGenerating}
            onClick={() => handleGenerate()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-violet-600/25 flex items-center justify-center gap-2 shrink-0"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Generando Mazo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Crear Flashcards</span>
              </>
            )}
          </button>
        </div>

        {/* Suggestion pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Target className="w-3.5 h-3.5" />
            Ideas para tu nivel:
          </span>
          {suggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setTopic(sug);
                handleGenerate(sug);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950/60 text-slate-700 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300 transition font-medium border border-slate-200 dark:border-slate-700"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Main Flashcard Interactive Player */}
      {currentDeck && !isFinished && currentCard && (
        <div className="space-y-4">
          
          {/* Deck Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  {currentDeck.subject || 'Materia'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">
                  Tarjeta {currentIndex + 1} de {activeCards.length}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                {currentDeck.title}
              </h3>
            </div>

            {/* Quick stats pills */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {masteredCount} dominadas
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                {goodCount} intermedio
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {needsPracticeCount} por repasar
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-violet-600 to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / activeCards.length) * 100}%` }}
            />
          </div>

          {/* 3D Flashcard Container */}
          <div className="perspective-1000 w-full min-h-[340px] sm:min-h-[380px] relative">
            <div
              onClick={() => setIsFlipped((prev) => !prev)}
              className={`w-full min-h-[340px] sm:min-h-[380px] rounded-3xl transition-transform duration-500 transform-style-3d cursor-pointer relative shadow-xl ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              
              {/* FRONT SIDE */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/90 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 dark:border-slate-700 flex flex-col justify-between backface-hidden">
                
                {/* Top card bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-wider">
                      {currentCard.category || 'Pregunta de Examen'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      currentCard.difficulty === 'hard'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : currentCard.difficulty === 'medium'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {currentCard.difficulty === 'hard' ? 'Alta Complejidad' : currentCard.difficulty === 'medium' ? 'Media' : 'Fundamental'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeak(currentCard.front);
                      }}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition"
                      title="Escuchar pregunta en voz alta"
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    {currentCard.hint && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint((prev) => !prev);
                        }}
                        className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold ${
                          showHint
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600'
                        }`}
                        title="Ver pista pedagógica"
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span className="hidden sm:inline">Pista</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Central Question / Challenge */}
                <div className="py-6 sm:py-8 text-center space-y-4">
                  <span className="text-xs uppercase tracking-widest font-black text-slate-400 dark:text-slate-500">
                    Pregunta / Reto Cognitivo:
                  </span>
                  <h4 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-relaxed max-w-2xl mx-auto">
                    {currentCard.front}
                  </h4>

                  {/* Hint reveal */}
                  {showHint && currentCard.hint && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-left text-xs text-amber-900 dark:text-amber-200 max-w-xl mx-auto animate-fadeIn flex items-start gap-2.5 shadow-sm"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Pista pedagógica:</span>
                        <p className="mt-0.5 leading-snug">{currentCard.hint}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom flip prompt */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-semibold">
                    <RotateCw className="w-4 h-4 animate-pulse" />
                    <span>Haz clic o presiona 'Espacio' para voltear y ver respuesta</span>
                  </div>
                  <span className="hidden sm:inline font-medium">Atajos: ⬅ ➡ Flechas</span>
                </div>

              </div>

              {/* BACK SIDE */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-500/40 flex flex-col justify-between backface-hidden rotate-y-180">
                
                {/* Top card bar */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Solución Pedagógica & Concepto
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeak(currentCard.back);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                    title="Escuchar explicación"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Central Explanation */}
                <div className="py-4 sm:py-6 space-y-3 overflow-y-auto max-h-[220px]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-300">
                    Respuesta del Profesor IA:
                  </span>
                  <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                    {currentCard.back}
                  </p>
                </div>

                {/* Self-Rating Prompt and Buttons */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="pt-4 border-t border-white/10 space-y-2.5"
                >
                  <p className="text-xs font-bold text-slate-300 text-center">
                    ¿Cómo te fue con esta tarjeta? Autocalifica tu dominio:
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRate('needs_practice')}
                      className="py-2.5 px-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 font-bold text-xs sm:text-sm transition flex flex-col sm:flex-row items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Aún me cuesta</span>
                      <span className="text-[10px] opacity-70 hidden sm:inline">(1)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRate('good')}
                      className="py-2.5 px-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 font-bold text-xs sm:text-sm transition flex flex-col sm:flex-row items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Más o menos</span>
                      <span className="text-[10px] opacity-70 hidden sm:inline">(2)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRate('mastered')}
                      className="py-2.5 px-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200 font-bold text-xs sm:text-sm transition flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg shadow-emerald-500/10"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>¡Lo domino!</span>
                      <span className="text-[10px] opacity-70 hidden sm:inline">(3)</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Navigation Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <span>{currentIndex === activeCards.length - 1 ? 'Finalizar Sesión' : 'Siguiente'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShuffle}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1.5"
                title="Mezclar tarjetas aleatoriamente"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Mezclar</span>
              </button>

              {needsPracticeCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOnlyDifficult((prev) => !prev);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    onlyDifficult
                      ? 'bg-rose-600 text-white'
                      : 'border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{onlyDifficult ? 'Ver Todas' : `Repasar Difíciles (${needsPracticeCount})`}</span>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Completion Results Screen */}
      {currentDeck && isFinished && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
              ¡Sesión de Autoevaluación Completada!
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {currentDeck.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              El recuerdo activo genera conexiones neuronales duraderas. Revisa tu índice de dominio a continuación:
            </p>
          </div>

          {/* Mastery Score Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl sm:text-4xl font-black text-violet-600 dark:text-violet-400">
              {masteryPercentage}%
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Nivel de Dominio General
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {masteredCount} de {totalCards} tarjetas dominadas con éxito
              </span>
            </div>
          </div>

          {/* Detailed stats */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
                {masteredCount}
              </span>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                Dominadas
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 block">
                {goodCount}
              </span>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                Intermedio
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 block">
                {needsPracticeCount}
              </span>
              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                Por repasar
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {needsPracticeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOnlyDifficult(true);
                  setCurrentIndex(0);
                  setIsFinished(false);
                  setIsFlipped(false);
                }}
                className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-md shadow-rose-600/25"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Repasar las {needsPracticeCount} tarjetas pendientes</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOnlyDifficult(false);
                setCurrentIndex(0);
                setIsFinished(false);
                setIsFlipped(false);
              }}
              className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-md shadow-violet-600/25"
            >
              <RotateCw className="w-4 h-4" />
              <span>Reiniciar mazo completo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentDeck(null);
                setIsFinished(false);
              }}
              className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Crear otro mazo</span>
            </button>
          </div>

        </div>
      )}

      {/* Saved Decks Library */}
      {savedDecks.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-500" />
              Biblioteca de Mazos Guardados ({savedDecks.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedDecks.map((deck) => {
              const deckMastered = deck.cards.filter((c) => c.userMastery === 'mastered').length;
              const isSelected = currentDeck?.id === deck.id;

              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    setCurrentDeck(deck);
                    setCurrentIndex(0);
                    setIsFinished(false);
                    setIsFlipped(false);
                    setOnlyDifficult(false);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition text-left space-y-2 relative group ${
                    isSelected
                      ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase truncate">
                      {deck.subject || 'General'} • {deck.cards.length} tarjetas
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteDeck(deck.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Eliminar mazo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                    {deck.title}
                  </h5>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <span>
                      {deckMastered}/{deck.cards.length} dominadas
                    </span>
                    <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold group-hover:underline">
                      <Play className="w-3 h-3 fill-current" />
                      Practicar
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
