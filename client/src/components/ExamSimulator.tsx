import React, { useEffect, useState } from 'react';
import { 
  FileQuestion, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Timer, 
  RotateCcw, 
  ArrowRight, 
  Lightbulb, 
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { StudentProfile, QuizQuestion, QuizResult } from '../types';
import { requestQuiz } from '../utils/api';
import { saveQuizResult } from '../utils/storage';
import { MarkdownText } from './MarkdownText';

interface ExamSimulatorProps {
  profile: StudentProfile;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ profile }) => {
  const [topic, setTopic] = useState<string>(profile.subject || 'Conceptos clave de la materia');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [quizData, setQuizData] = useState<{ title: string; questions: QuizQuestion[] } | null>(null);
  
  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  useEffect(() => {
    setTopic(profile.subject || 'Conceptos clave de la materia');
    setQuizData(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
    setShowAnswerFeedback(false);
  }, [profile.id, profile.subject]);

  // Suggested quick topics based on level
  const getSuggestedTopics = () => {
    if (profile.level === 'primaria') {
      return ['Tablas de Multiplicar del 2 al 9', 'Partes de la Oración y Verbos', 'Los Seres Vivos y Ecosistemas', 'Operaciones Básicas'];
    } else if (profile.level === 'secundaria') {
      return ['Leyes de Newton y Cinemática', 'Ecuaciones de Primer y Segundo Grado', 'Tabla Periódica y Enlaces Químicos', 'Célula y Genética Básica'];
    } else if (profile.level === 'universidad') {
      if (profile.career?.toLowerCase().includes('medicin')) {
        return ['Farmacocinética y Farmacodinamia', 'Anatomía y Fisiología Cardiovascular', 'Semiología de Tórax', 'Microbiología Clínica'];
      }
      return ['Estructuras de Datos y Algoritmos', 'Cálculo Multivariable y Series', 'Principios de Arquitectura de Software', 'Termodinámica'];
    } else {
      return ['Conceptos Prácticos Esenciales', 'Casos de Aplicación Real', 'Preguntas de Comprensión General'];
    }
  };

  const handleStartQuiz = async () => {
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowAnswerFeedback(false);
    setIsFinished(false);

    try {
      const res = await requestQuiz(topic, profile, difficulty);
      if (res.questions && res.questions.length > 0) {
        setQuizData(res);
      } else {
        alert('No se pudieron generar preguntas para este tema. Intenta con otro tema más específico.');
      }
    } catch (err: any) {
      console.error('Quiz error:', err);
      alert('Error al generar el examen. Por favor intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (selectedAnswers[currentQuestionIndex] !== undefined) return; // already answered
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }));
    setShowAnswerFeedback(true);
  };

  const handleNextQuestion = () => {
    if (!quizData) return;
    if (currentQuestionIndex + 1 < quizData.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowAnswerFeedback(selectedAnswers[currentQuestionIndex + 1] !== undefined);
    } else {
      // Calculate score and finish
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    if (!quizData) return;
    let score = 0;
    const userAnswersList: number[] = [];

    quizData.questions.forEach((q, idx) => {
      const ans = selectedAnswers[idx];
      userAnswersList.push(ans !== undefined ? ans : -1);
      if (ans === q.correctIndex) {
        score++;
      }
    });

    const finalResult: QuizResult = {
      id: `quiz_${Date.now()}`,
      profileId: profile.id,
      title: quizData.title,
      topic,
      subject: profile.subject,
      level: profile.level,
      questions: quizData.questions,
      userAnswers: userAnswersList,
      score,
      total: quizData.questions.length,
      timestamp: new Date().toISOString(),
    };

    saveQuizResult(finalResult, profile.id);
    setIsFinished(true);
  };

  const currentQ = quizData?.questions[currentQuestionIndex];
  const totalQuestions = quizData?.questions.length || 0;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <FileQuestion className="w-4 h-4" />
            <span>Simulador Interactivo de Exámenes</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Prácticas y Pruebas Adaptativas
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-xl">
            Genera un simulacro a tu medida. Cada pregunta cuenta con explicaciones detalladas y trucos para memorizar.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-2xl bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20 self-start sm:self-auto">
          {profile.level === 'primaria' && '🍎 Examen de Primaria'}
          {profile.level === 'secundaria' && '🏫 Simulacro de Liceo'}
          {profile.level === 'universidad' && '🎓 Parcial Universitario'}
          {profile.level === 'posgrado' && '🏛️ Evaluación de Posgrado'}
          {profile.level === 'autodidacta' && '💡 Reto Autodidacta'}
        </div>
      </div>

      {/* Generator Form if no quiz active or finished */}
      {(!quizData || isFinished) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Configurar Nuevo Simulacro de Examen:
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tema o Asignatura a Evaluar:
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: Fisiología cardiovascular, Ecuaciones de 2º grado, Fracciones..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick topic buttons */}
          <div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Temas recomendados para {profile.level}:
            </span>
            <div className="flex flex-wrap gap-2">
              {getSuggestedTopics().map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="text-xs px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty selector */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Dificultad:
            </span>
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                  difficulty === d
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Intermedio' : 'Exigente / Avanzado'}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={!topic.trim() || isGenerating}
              onClick={handleStartQuiz}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Tu Profesor IA está redactando las preguntas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Simulacro de Examen</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Quiz Taking Interface */}
      {quizData && !isFinished && currentQ && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-fadeIn">
          
          {/* Quiz Header & Progress */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {quizData.title}
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Pregunta {currentQuestionIndex + 1} de {totalQuestions}
              </div>
            </div>

            <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              <MarkdownText content={currentQ.question} />
            </h4>
          </div>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((opt, optIndex) => {
              const isSelected = selectedAnswers[currentQuestionIndex] === optIndex;
              const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
              const isCorrect = optIndex === currentQ.correctIndex;

              let optionStyle = 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30 font-bold';
                } else if (isSelected) {
                  optionStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/30';
                } else {
                  optionStyle = 'opacity-50 border-slate-200 dark:border-slate-800 text-slate-500';
                }
              }

              return (
                <button
                  key={optIndex}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(optIndex)}
                  className={`p-4 rounded-2xl border text-left text-xs sm:text-sm transition flex items-center justify-between gap-3 ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + optIndex)}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </div>

                  {isAnswered && (
                    <div className="shrink-0">
                      {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Explanation Card (Appears after answer is selected) */}
          {showAnswerFeedback && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Explicación del Profesor:</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <MarkdownText content={currentQ.explanation} />
              </p>
              {currentQ.tip && (
                <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 italic pt-1">
                  💡 Truco para recordar: "{currentQ.tip}"
                </div>
              )}
            </div>
          )}

          {/* Next Button */}
          {selectedAnswers[currentQuestionIndex] !== undefined && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-md shadow-indigo-600/30"
              >
                <span>{currentQuestionIndex + 1 < totalQuestions ? 'Siguiente Pregunta' : 'Ver Calificación Final'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      )}

      {/* Finished Summary Results Screen */}
      {isFinished && quizData && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-fadeIn">
          
          {/* Trophy Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center mx-auto text-4xl shadow-xl shadow-amber-500/25">
            🏆
          </div>

          <div>
            <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Simulacro Completado
            </span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              ¡Buen trabajo, {profile.name}!
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1">
              Aquí está el resultado de tu examen de práctica sobre: "{topic}"
            </p>
          </div>

          {/* Score Circle */}
          {(() => {
            let correct = 0;
            quizData.questions.forEach((q, i) => {
              if (selectedAnswers[i] === q.correctIndex) correct++;
            });
            const percent = Math.round((correct / quizData.questions.length) * 100);

            return (
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 max-w-sm mx-auto">
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {correct} / {quizData.questions.length}
                </div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
                  {percent}% de aciertos ({percent >= 75 ? '¡Excelente Dominio!' : percent >= 50 ? '¡Buen avance, a repasar detalles!' : '¡Sigue practicando, estás aprendiendo!'})
                </div>
              </div>
            );
          })()}

          {/* Reset or try another */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setQuizData(null);
                setIsFinished(false);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practicar otro tema</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
