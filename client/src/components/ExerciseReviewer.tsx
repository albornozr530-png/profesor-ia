import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  History, 
  BookOpen, 
  Check, 
  HelpCircle,
  FileCheck2,
  ListOrdered,
  Mic,
  MicOff
} from 'lucide-react';
import { StudentProfile, ExerciseReviewResult } from '../types';
import { requestExerciseReview } from '../utils/api';
import { getStoredReviews, saveReviewResult } from '../utils/storage';
import { isDictationAvailable, startDictation, DictationController } from '../utils/speech';

interface ExerciseReviewerProps {
  profile: StudentProfile;
  initialExercise?: string;
}

export const ExerciseReviewer: React.FC<ExerciseReviewerProps> = ({
  profile,
  initialExercise = '',
}) => {
  const [statement, setStatement] = useState<string>(initialExercise);
  const [studentWork, setStudentWork] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<ExerciseReviewResult | null>(null);
  const [history, setHistory] = useState<ExerciseReviewResult[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Dictado universal para enunciado y desarrollo.
  const [activeDictationTarget, setActiveDictationTarget] = useState<'statement' | 'work' | null>(null);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [isDictationSupported, setIsDictationSupported] = useState<boolean>(true);
  const [isStartingDictation, setIsStartingDictation] = useState<boolean>(false);
  const dictationRef = useRef<DictationController | null>(null);
  const dictationTargetRef = useRef<'statement' | 'work' | null>(null);

  useEffect(() => {
    let mounted = true;
    isDictationAvailable()
      .then((available) => {
        if (mounted) setIsDictationSupported(available);
      })
      .catch(() => {
        if (mounted) setIsDictationSupported(false);
      });

    return () => {
      mounted = false;
      void dictationRef.current?.dispose();
      dictationRef.current = null;
    };
  }, []);

  const toggleDictation = async (target: 'statement' | 'work') => {
    if (activeDictationTarget === target || isStartingDictation) {
      try {
        await dictationRef.current?.stop();
      } finally {
        dictationRef.current = null;
        dictationTargetRef.current = null;
        setActiveDictationTarget(null);
      }
      return;
    }

    if (!isDictationSupported) {
      setDictationError('El dictado no está disponible en este entorno. Usa Chrome, Edge, Opera o la aplicación Android.');
      return;
    }

    try {
      await dictationRef.current?.dispose();
      dictationRef.current = null;
      dictationTargetRef.current = target;
      setActiveDictationTarget(target);
      setDictationError(null);
      setIsStartingDictation(true);
      const controller = await startDictation({
        onText: (text) => {
          if (dictationTargetRef.current === 'statement') {
            setStatement((previous) => (previous.trim() ? `${previous.trim()} ${text.trim()}` : text.trim()));
          } else if (dictationTargetRef.current === 'work') {
            setStudentWork((previous) => (previous.trim() ? `${previous.trim()} ${text.trim()}` : text.trim()));
          }
        },
        onStateChange: (listening) => {
          if (!listening) {
            setActiveDictationTarget(null);
            dictationTargetRef.current = null;
          }
        },
        onError: (message) => {
          setDictationError(message);
          setActiveDictationTarget(null);
          dictationTargetRef.current = null;
        },
      });
      dictationRef.current = controller;
    } catch (error) {
      console.error('No se pudo iniciar el dictado:', error);
      setActiveDictationTarget(null);
      dictationTargetRef.current = null;
    } finally {
      setIsStartingDictation(false);
    }
  };

  useEffect(() => {
    setHistory(getStoredReviews(profile.id));
  }, [profile.id]);

  useEffect(() => {
    setStatement(initialExercise);
    setStudentWork('');
    setCurrentResult(null);
    setShowHistory(false);
    setActiveDictationTarget(null);
    dictationTargetRef.current = null;
    void dictationRef.current?.dispose();
    dictationRef.current = null;
  }, [profile.id, initialExercise]);

  // Level-specific preset examples for quick testing
  const getPresetExamples = () => {
    if (profile.level === 'primaria') {
      return [
        {
          title: '🍎 Repartición de Manzanas',
          statement: 'Tengo 18 manzanas y quiero repartirlas en partes iguales entre 3 amigos. ¿Cuántas manzanas le tocan a cada amigo?',
          work: 'Yo hice 18 - 3 = 15 manzanas para cada uno.',
        },
        {
          title: '✏️ Suma de Fracciones',
          statement: 'Calcula: 2/5 + 1/5 = ?',
          work: 'Sumé los de arriba 2 + 1 = 3, y los de abajo 5 + 5 = 10. Mi respuesta es 3/10.',
        },
      ];
    } else if (profile.level === 'secundaria') {
      return [
        {
          title: '📐 Ecuación de Segundo Grado',
          statement: 'Resuelve la ecuación: x² - 5x + 6 = 0',
          work: 'Factoricé buscando dos números: (x - 2)(x - 3) = 0. Por lo tanto, x1 = 2 y x2 = 3.',
        },
        {
          title: '⚡ Ley de Ohm en Física',
          statement: 'Un circuito tiene un voltaje de 12V y una resistencia de 4 ohmios. ¿Cuál es la intensidad de corriente?',
          work: 'Fórmula V = I * R. Entonces I = V * R = 12 * 4 = 48 Amperios.',
        },
      ];
    } else if (profile.level === 'universidad') {
      if (profile.career?.toLowerCase().includes('medicin')) {
        return [
          {
            title: '🩺 Caso de Farmacología Médica',
            statement: 'Paciente masculino de 65 años con hipertensión arterial estadio 1 y antecedente de asma bronquial moderada persistente. ¿Es adecuado iniciar tratamiento antihipertensivo con Propranolol?',
            work: 'Sí, porque el propranolol es un betabloqueante efectivo que disminuye el gasto cardíaco y la presión arterial.',
          },
          {
            title: '🔬 Fisiología Cardíaca',
            statement: 'Explica qué evento mecánico coincide con el cierre de las válvulas auriculoventriculares (mitral y tricúspide) y cuál ruido cardíaco genera.',
            work: 'Coincide con el inicio de la sístole ventricular (contracción isovolumétrica) y produce el primer ruido cardíaco (R1).',
          },
        ];
      }
      return [
        {
          title: '💻 Algoritmia y Complejidad',
          statement: '¿Cuál es la complejidad temporal en el peor caso de ordenar un arreglo de n elementos usando QuickSort?',
          work: 'Es O(n log n) en todos los casos porque siempre divide a la mitad.',
        },
        {
          title: '📊 Cálculo Integral',
          statement: 'Calcula la integral definida de 0 a 2 de: f(x) = 3x² dx',
          work: 'La antiderivada es x³. Evaluando de 0 a 2: 2³ - 0³ = 8.',
        },
      ];
    } else {
      return [
        {
          title: '💡 Ejemplo Práctico',
          statement: 'Si un producto cuesta $100 y tiene un 20% de descuento, pero luego se aplica un 10% de impuesto sobre el valor rebajado, ¿cuál es el precio final?',
          work: '100 - 20 = 80. Impuesto 10% de 80 es 8. Total = 88.',
        },
      ];
    }
  };

  const handleApplyPreset = (preset: { statement: string; work: string }) => {
    setStatement(preset.statement);
    setStudentWork(preset.work);
    setCurrentResult(null);
  };

  const handleReview = async () => {
    if (!statement.trim() || !studentWork.trim() || isReviewing) return;

    setIsReviewing(true);
    try {
      const evaluation = await requestExerciseReview(statement, studentWork, profile);

      const fullResult: ExerciseReviewResult = {
        id: `rev_${Date.now()}`,
        profileId: profile.id,
        timestamp: new Date().toISOString(),
        exerciseStatement: statement,
        studentWork,
        status: evaluation.status,
        summary: evaluation.summary,
        identifiedMistake: evaluation.identifiedMistake,
        stepByStep: evaluation.stepByStep,
        pedagogicalExplanation: evaluation.pedagogicalExplanation,
        encouragement: evaluation.encouragement,
        suggestedPractice: evaluation.suggestedPractice,
        subject: profile.subject || 'General',
      };

      setCurrentResult(fullResult);
      saveReviewResult(fullResult, profile.id);
      setHistory((prev) => [fullResult, ...prev]);
    } catch (err: any) {
      console.error('Error reviewing exercise:', err);
      alert('Hubo un inconveniente al revisar el ejercicio. Por favor inténtalo nuevamente.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handlePracticeSuggested = () => {
    if (currentResult?.suggestedPractice) {
      setStatement(currentResult.suggestedPractice);
      setStudentWork('');
      setCurrentResult(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>Módulo de Corrección Pedagógica</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            ¿Está bien mi ejercicio o tarea?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
            Ingresa el problema y tu respuesta. Tu profesor analizará cada paso, te dirá con exactitud si está bien o dónde te equivocaste, y te explicará el método sin juzgarte.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-semibold transition border border-white/20 self-start sm:self-auto"
        >
          <History className="w-4 h-4" />
          <span>Historial ({history.length})</span>
        </button>
      </div>

      {dictationError && (
        <div role="alert" className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <span>{dictationError}</span>
          <button type="button" onClick={() => setDictationError(null)} className="font-semibold underline shrink-0">Cerrar</button>
        </div>
      )}

      {/* History Drawer / Modal view if open */}
      {showHistory && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              Ejercicios Revisados Anteriormente
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-700 hover:text-slate-800 font-semibold"
            >
              Ocultar
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-700 dark:text-slate-300 py-3 text-center">
              Aún no has revisado ejercicios. ¡Prueba ingresando uno abajo!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    setCurrentResult(h);
                    setStatement(h.exerciseStatement);
                    setStudentWork(h.studentWork);
                    setShowHistory(false);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                      {h.subject}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      h.status === 'correct'
                        ? 'bg-emerald-100 text-emerald-700'
                        : h.status === 'partially_correct'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {h.status === 'correct' ? '✅ Correcto' : h.status === 'partially_correct' ? '⚠️ Casi listo' : '❌ Corregir'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                    {h.exerciseStatement}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Dual Card: Problem & Solution Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Step 1: Problem Statement */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                1
              </span>
              Enunciado del Ejercicio o Problema:
            </label>
            <button
              type="button"
              onClick={() => void toggleDictation('statement')}
              disabled={!isDictationSupported || isStartingDictation}
              title={isDictationSupported ? 'Dictar enunciado por voz' : 'Dictado no disponible'}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition font-medium disabled:opacity-50 ${
                activeDictationTarget === 'statement'
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {activeDictationTarget === 'statement' ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Detener</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Dictar</span>
                </>
              )}
            </button>
          </div>

          <textarea
            rows={5}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder={
              activeDictationTarget === 'statement'
                ? '🎙️ Dictando enunciado... Habla ahora'
                : 'Copia o escribe aquí el problema que te mandaron a hacer...'
            }
            className={`w-full p-3.5 rounded-2xl border bg-slate-50/70 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition resize-none ${
              activeDictationTarget === 'statement'
                ? 'border-red-500 ring-2 ring-red-400/30'
                : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500'
            }`}
          />

          {/* Quick Presets for this level */}
          <div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Ejemplos rápidos para probar ({profile.level}):
            </span>
            <div className="flex flex-wrap gap-2">
              {getPresetExamples().map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:border-indigo-300 transition"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Student's Work / Solution */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                2
              </span>
              Tu Respuesta o Desarrollo:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleDictation('work')}
                disabled={!isDictationSupported || isStartingDictation}
                title={isDictationSupported ? 'Dictar tu solución por voz' : 'Dictado no disponible'}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition font-medium disabled:opacity-50 ${
                  activeDictationTarget === 'work'
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {activeDictationTarget === 'work' ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Detener</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Dictar</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-slate-700 dark:text-slate-300 hidden sm:inline">
                Paso a paso o resultado
              </span>
            </div>
          </div>

          <textarea
            rows={5}
            value={studentWork}
            onChange={(e) => setStudentWork(e.target.value)}
            placeholder={
              activeDictationTarget === 'work'
                ? '🎙️ Dictando tu procedimiento o respuesta... Habla ahora'
                : 'Escribe lo que hiciste tú para resolverlo: qué fórmula usaste, tus operaciones o tu conclusión...'
            }
            className={`w-full p-3.5 rounded-2xl border bg-slate-50/70 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition resize-none ${
              activeDictationTarget === 'work'
                ? 'border-red-500 ring-2 ring-red-400/30'
                : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500'
            }`}
          />

          <div className="pt-2">
            <button
              type="button"
              disabled={!statement.trim() || !studentWork.trim() || isReviewing}
              onClick={handleReview}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
            >
              {isReviewing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>El Profesor IA está revisando tu procedimiento...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>Revisar mi Ejercicio Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Review Result Assessment Panel */}
      {currentResult && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-fadeIn">
          
          {/* Status Badge & Summary */}
          <div className={`p-4 rounded-2xl border flex items-start gap-4 ${
            currentResult.status === 'correct'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : currentResult.status === 'partially_correct'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
          }`}>
            <div className="text-3xl shrink-0 mt-0.5">
              {currentResult.status === 'correct' && '🎉'}
              {currentResult.status === 'partially_correct' && '🧐'}
              {currentResult.status === 'needs_work' && '💡'}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  currentResult.status === 'correct'
                    ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                    : currentResult.status === 'partially_correct'
                    ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                    : 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                }`}>
                  {currentResult.status === 'correct'
                    ? '¡Excelente! Ejercicio Correcto'
                    : currentResult.status === 'partially_correct'
                    ? '¡Casi perfecto! Detalle por ajustar'
                    : 'Requiere Corrección y Aprendizaje'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold">
                {currentResult.summary}
              </h3>
            </div>
          </div>

          {/* Identified Mistake Callout (if any) */}
          {currentResult.identifiedMistake && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  ¿Dónde estuvo el detalle a corregir?
                </h4>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed font-medium">
                  {currentResult.identifiedMistake}
                </p>
              </div>
            </div>
          )}

          {/* Step by Step Breakdown */}
          {currentResult.stepByStep && currentResult.stepByStep.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-indigo-500" />
                Análisis paso a paso de tu procedimiento:
              </h4>
              <div className="space-y-2">
                {currentResult.stepByStep.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start gap-2.5"
                  >
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pedagogical Explanation */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Explicación del Profesor (Cómo razonarlo paso a paso):
            </h4>
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {currentResult.pedagogicalExplanation}
            </div>
          </div>

          {/* Encouragement & Practice Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 italic">
              <span>🌟</span>
              <span>"{currentResult.encouragement}"</span>
            </div>

            {currentResult.suggestedPractice && (
              <button
                type="button"
                onClick={handlePracticeSuggested}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
              >
                <span>Hacer ejercicio de práctica</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
