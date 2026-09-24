import React, { useState } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  CheckSquare, 
  FileQuestion, 
  BookMarked, 
  UserCircle, 
  RefreshCw,
  Search,
  ChevronDown
} from 'lucide-react';
import { StudentProfile } from '../types';
import { ACADEMIC_LEVELS, POPULAR_CAREERS } from '../utils/academicPresets';

interface NavbarProps {
  profile: StudentProfile;
  activeTab: 'chat' | 'review' | 'quiz' | 'notes' | 'progress';
  onTabChange: (tab: 'chat' | 'review' | 'quiz' | 'notes' | 'progress') => void;
  onEditProfile: () => void;
  onUpdateSubject: (newSubject: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeTab,
  onTabChange,
  onEditProfile,
  onUpdateSubject,
}) => {
  const [showSubjectPicker, setShowSubjectPicker] = useState<boolean>(false);
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');

  const levelInfo = ACADEMIC_LEVELS.find((l) => l.id === profile.level) || ACADEMIC_LEVELS[1];
  
  // Available quick subjects for dropdown
  let availableSubjects = levelInfo.subjects;
  if (profile.level === 'universidad' && profile.career) {
    const career = POPULAR_CAREERS.find((c) => c.name === profile.career);
    if (career) {
      availableSubjects = Object.values(career.semesterSubjects).flat();
    }
  }

  const handleSelectSubject = (s: string) => {
    onUpdateSubject(s);
    setShowSubjectPicker(false);
  };

  const handleCustomSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSubjectInput.trim()) {
      onUpdateSubject(customSubjectInput.trim());
      setCustomSubjectInput('');
      setShowSubjectPicker(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        
        {/* Top row: Brand & Profile Bar */}
        <div className="flex items-center justify-between py-2.5 gap-2">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 text-xl font-bold">
              👨‍🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
                  Profesor IA
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Tutor Adaptativo
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 hidden md:block">
                Tu profesor personal con razonamiento adaptativo y búsqueda web
              </p>
            </div>
          </div>

          {/* Student Profile & Quick Subject Pill */}
          <div className="flex items-center gap-2">
            
            {/* Current Subject Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSubjectPicker(!showSubjectPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-sm"
                title="Cambiar materia actual"
              >
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 hidden sm:inline">Materia:</span>
                <span className="max-w-[140px] sm:max-w-[180px] truncate font-bold">
                  {profile.subject || 'Materia General'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {/* Subject Popover */}
              {showSubjectPicker && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cambiar Materia de Estudio
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSubjectPicker(false)}
                      className="text-xs text-slate-600 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCustomSubjectSubmit} className="mb-2">
                    <input
                      type="text"
                      value={customSubjectInput}
                      onChange={(e) => setCustomSubjectInput(e.target.value)}
                      placeholder="Escribe otra materia o tema..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </form>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {availableSubjects.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleSelectSubject(sub)}
                        className={`w-full text-left text-xs p-2 rounded-lg transition ${
                          profile.subject === sub
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill & Switch Level Button */}
            <button
              type="button"
              onClick={onEditProfile}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
              title="Ver o cambiar perfil de estudiante"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {profile.name.charAt(0).toUpperCase()}
              </div>

              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[100px]">
                  {profile.name}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">
                  {levelInfo.badge} • {profile.age}a
                  {profile.career && ` • ${profile.career.slice(0, 10)}...`}
                </span>
              </div>

              <RefreshCw className="w-3.5 h-3.5 text-slate-600 hover:text-indigo-600" />
            </button>

          </div>
        </div>

        {/* Bottom row: Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1.5 scrollbar-none text-xs font-semibold">
          
          <button
            type="button"
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tutoría & Chat</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('review')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition whitespace-nowrap relative ${
              activeTab === 'review'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Revisar mi Ejercicio / Tarea</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-extrabold uppercase">
              IA
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('quiz')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>Prácticas de Examen</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('notes')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'notes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Fichas & Apuntes</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('progress')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            <span>Mi Historial & Notas</span>
          </button>

        </nav>

      </div>
    </header>
  );
};
