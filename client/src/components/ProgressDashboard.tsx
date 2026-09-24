import React, { useState, useEffect } from 'react';
import { 
  UserCircle, 
  Award, 
  CheckCircle2, 
  FileQuestion, 
  BookMarked, 
  Calendar, 
  RefreshCw, 
  PlusCircle, 
  Trash2, 
  TrendingUp,
  ShieldCheck,
  Phone
} from 'lucide-react';
import { StudentProfile, ExerciseReviewResult, QuizResult } from '../types';
import { 
  getAllStoredProfiles, 
  getStoredReviews, 
  getStoredQuizzes, 
  getStoredNotes,
  saveStoredProfile,
  removeStoredProfile 
} from '../utils/storage';
import { ACADEMIC_LEVELS } from '../utils/academicPresets';

interface ProgressDashboardProps {
  currentProfile: StudentProfile;
  onSelectProfile: (profile: StudentProfile) => void;
  onNewProfile: () => void;
  onEditCurrentProfile: () => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  currentProfile,
  onSelectProfile,
  onNewProfile,
  onEditCurrentProfile,
}) => {
  const [allProfiles, setAllProfiles] = useState<StudentProfile[]>([]);
  const [reviews, setReviews] = useState<ExerciseReviewResult[]>([]);
  const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
  const [notesCount, setNotesCount] = useState<number>(0);

  useEffect(() => {
    setAllProfiles(getAllStoredProfiles());
    setReviews(getStoredReviews(currentProfile.id));
    setQuizzes(getStoredQuizzes(currentProfile.id));
    setNotesCount(getStoredNotes(currentProfile.id).length);
  }, [currentProfile.id, currentProfile.age, currentProfile.name, currentProfile.level, currentProfile.subject]);

  const levelInfo = ACADEMIC_LEVELS.find((l) => l.id === currentProfile.level) || ACADEMIC_LEVELS[1];

  // Stats calculation
  const correctReviews = reviews.filter((r) => r.status === 'correct').length;
  const partiallyCorrect = reviews.filter((r) => r.status === 'partially_correct').length;
  const avgQuizScore = quizzes.length > 0
    ? Math.round(
        (quizzes.reduce((acc, q) => acc + (q.score / (q.total || 1)), 0) / quizzes.length) * 100
      )
    : 0;

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar este perfil de estudiante?')) {
      removeStoredProfile(id);
      setAllProfiles((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Student Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg shadow-indigo-500/30">
            {currentProfile.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {currentProfile.name}
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {levelInfo.badge}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Edad: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentProfile.ageConfirmed ? `${currentProfile.age} años` : 'por confirmar'}</span>
              {currentProfile.career && (
                <> • Carrera: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentProfile.career}</span> ({currentProfile.semester || 'Semestre en curso'})</>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                {currentProfile.authMethod === 'google' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Google ({currentProfile.email || 'Conectado'})</span>
                  </>
                ) : currentProfile.authMethod === 'phone' ? (
                  <>
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    <span>Teléfono ({currentProfile.phone || 'Verificado'})</span>
                  </>
                ) : (
                  <span>Acceso Inmediato</span>
                )}
              </span>
              <span>•</span>
              <span>Materia activa: <b className="text-indigo-600 dark:text-indigo-400">{currentProfile.subject}</b></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={onEditCurrentProfile}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
          >
            Editar Perfil
          </button>
          <button
            type="button"
            onClick={onNewProfile}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Estudiante</span>
          </button>
        </div>

      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {reviews.length}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            Tareas / Ejercicios Revisados
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {quizzes.length}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            Exámenes Realizados
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {avgQuizScore}%
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            Promedio en Simulacros
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2">
            <BookMarked className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {notesCount}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            Fichas de Apuntes Creadas
          </div>
        </div>

      </div>

      {/* Switch Profiles Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-indigo-500" />
          Perfiles Guardados en este Dispositivo ({allProfiles.length}):
        </h3>
        <p className="text-xs text-slate-500">
          Ideal si varios hermanos o integrantes de la familia usan el profesor IA para diferentes niveles (ej. uno en Primaria y otro en Medicina o Secundaria).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {allProfiles.map((p) => {
            const isCurrent = p.id === currentProfile.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProfile(p)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {p.name} {isCurrent && '(Activo)'}
                    </h4>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {p.level.toUpperCase()} • {p.ageConfirmed ? `${p.age} años` : 'edad por confirmar'}
                    </span>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteProfile(p.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    title="Eliminar este perfil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
