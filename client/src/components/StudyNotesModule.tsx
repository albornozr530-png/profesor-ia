import React, { useState, useEffect } from 'react';
import { 
  BookMarked, 
  Sparkles, 
  Copy, 
  Check, 
  Lightbulb, 
  AlertOctagon, 
  Bookmark, 
  CheckCircle,
  FolderOpen,
  BrainCircuit,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StudentProfile, StudyNote } from '../types';
import { requestStudyNotes } from '../utils/api';
import { getStoredNotes, saveStudyNote } from '../utils/storage';
import { InteractiveFlashcards } from './InteractiveFlashcards';

interface StudyNotesModuleProps {
  profile: StudentProfile;
}

export const StudyNotesModule: React.FC<StudyNotesModuleProps> = ({ profile }) => {
  const [activeSubTab, setActiveSubTab] = useState<'notes' | 'flashcards'>('notes');
  const [topic, setTopic] = useState<string>(profile.subject || 'Conceptos fundamentales');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<StudyNote | null>(null);
  const [savedNotes, setSavedNotes] = useState<StudyNote[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // States to pass to Flashcards component when converting
  const [flashcardTopic, setFlashcardTopic] = useState<string>('');
  const [flashcardContext, setFlashcardContext] = useState<string>('');

  useEffect(() => {
    setSavedNotes(getStoredNotes(profile.id));
  }, [profile.id]);

  useEffect(() => {
    setTopic(profile.subject || 'Conceptos fundamentales');
    setCurrentNote(null);
    setFlashcardTopic('');
    setFlashcardContext('');
    setActiveSubTab('notes');
  }, [profile.id, profile.subject]);

  const handleGenerate = async () => {
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const result = await requestStudyNotes(topic, profile);
      const fullNote: StudyNote = {
        id: `note_${Date.now()}`,
        profileId: profile.id,
        timestamp: new Date().toISOString(),
        subject: profile.subject,
        ...result,
      };

      setCurrentNote(fullNote);
      saveStudyNote(fullNote, profile.id);
      setSavedNotes((prev) => [fullNote, ...prev]);
    } catch (err: any) {
      console.error('Notes error:', err);
      alert('Error al generar la ficha de apuntes. Inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConvertToFlashcards = (note: StudyNote) => {
    setFlashcardTopic(note.title || note.topic);
    const context = `TÍTULO: ${note.title}\nRESUMEN: ${note.summary}\nPUNTOS CLAVE: ${note.keyPoints.join('; ')}\nEJEMPLO PRÁCTICO: ${note.practicalExample}\nTRUCO MNEMOTÉCNICO: ${note.memoryTrick}\nERROR A EVITAR: ${note.commonMistakeToAvoid || 'N/A'}`;
    setFlashcardContext(context);
    setActiveSubTab('flashcards');
  };

  const handleCopy = async () => {
    if (!currentNote) return;
    const textToCopy = `# ${currentNote.title}
## Resumen
${currentNote.summary}

## Puntos Clave
${currentNote.keyPoints.map((k) => `- ${k}`).join('\n')}

## Ejemplo Práctico
${currentNote.practicalExample}

## Truco Mnemotécnico
${currentNote.memoryTrick}
`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard no disponible');
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('No se pudo copiar la ficha:', error);
      alert('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-center sm:justify-start gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm w-fit mx-auto sm:mx-0">
        <button
          type="button"
          onClick={() => setActiveSubTab('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSubTab === 'notes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>Apuntes & Resúmenes</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!flashcardTopic && currentNote) {
              setFlashcardTopic(currentNote.title);
            }
            setActiveSubTab('flashcards');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSubTab === 'flashcards'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-violet-400" />
          <span>Flashcards & Autoevaluación</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-extrabold uppercase">
            IA
          </span>
        </button>
      </div>

      {/* Conditionally Render Flashcards View */}
      {activeSubTab === 'flashcards' ? (
        <InteractiveFlashcards
          profile={profile}
          initialTopic={flashcardTopic}
          initialNoteContext={flashcardContext}
          onBackToNotes={() => setActiveSubTab('notes')}
        />
      ) : (
        /* Regular Notes View */
        <div className="space-y-6">
          
          {/* Banner */}
          <div className="bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
                <BookMarked className="w-4 h-4" />
                <span>Fichas Sintéticas & Método de Estudio</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Apuntes Inteligentes y Mnemotécnicos
              </h2>
              <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
                Genera esquemas de alto impacto calibrados a tu nivel: resumen claro, puntos no negociables, ejemplos del mundo real y trucos para memorizar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('flashcards')}
              className="self-start sm:self-center px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition flex items-center gap-2 shrink-0 shadow-sm"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Modo Flashcards</span>
            </button>
          </div>

          {/* Input box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              ¿Sobre qué tema o concepto quieres que tu Profesor IA elabore la ficha de apuntes?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                placeholder="Ej: Mitosis vs Meiosis, Fotosíntesis, Leyes de De Morgan, Insuficiencia cardíaca..."
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={!topic.trim() || isGenerating}
                onClick={handleGenerate}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-indigo-600/25 flex items-center gap-2 shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Sintetizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Crear Ficha</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Note Card */}
          {currentNote && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 animate-fadeIn">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Ficha de Estudio • {currentNote.subject || 'General'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {currentNote.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleConvertToFlashcards(currentNote)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-sm shadow-violet-600/25"
                    title="Convertir esta ficha en flashcards interactivas"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Convertir a Flashcards</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Central Summary */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider mb-1">
                  Resumen Conceptual:
                </h4>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {currentNote.summary}
                </p>
              </div>

              {/* Key Points */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Puntos Clave Indispensables:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentNote.keyPoints.map((kp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2"
                    >
                      <span className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-snug font-medium">{kp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Example */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider mb-1">
                  Ejemplo o Caso Práctico en la Realidad:
                </h4>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {currentNote.practicalExample}
                </p>
              </div>

              {/* Memory Trick / Mnemonic */}
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Truco Mnemotécnico para el Examen:
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed font-medium">
                    {currentNote.memoryTrick}
                  </p>
                </div>
              </div>

              {/* Common Mistake to Avoid */}
              {currentNote.commonMistakeToAvoid && (
                <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                      Error Típico a Evitar:
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                      {currentNote.commonMistakeToAvoid}
                    </p>
                  </div>
                </div>
              )}

              {/* Conversion Callout Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-violet-600/25 shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      ¿Quieres poner a prueba tu memoria y autoevaluarte?
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Convierte automáticamente este tema en tarjetas didácticas interactivas con preguntas de examen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleConvertToFlashcards(currentNote)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold transition shadow-md shadow-violet-600/25 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Crear Flashcards</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* Saved Notes History Library */}
          {savedNotes.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                Biblioteca de Fichas Guardadas ({savedNotes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {savedNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setCurrentNote(note)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition text-left space-y-1 group ${
                      currentNote?.id === note.id
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block truncate">
                        {note.subject}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvertToFlashcards(note);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 hover:bg-violet-200 font-bold opacity-0 group-hover:opacity-100 transition"
                        title="Convertir a Flashcards"
                      >
                        ⚡ Flashcards
                      </button>
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {note.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {note.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
