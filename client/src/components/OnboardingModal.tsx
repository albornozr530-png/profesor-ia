import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Award, 
  Compass, 
  Check, 
  ArrowRight, 
  User, 
  Phone, 
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { AcademicLevel, StudentProfile } from '../types';
import { ACADEMIC_LEVELS, POPULAR_CAREERS, POSGRADO_AREAS } from '../utils/academicPresets';

interface OnboardingModalProps {
  isOpen: boolean;
  initialProfile?: StudentProfile | null;
  onComplete: (profile: StudentProfile) => void;
  onCancel?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialProfile,
  onComplete,
  onCancel,
}) => {
  const validStoredAge = (() => {
    const value = Number(initialProfile?.age);
    return initialProfile?.ageConfirmed === true && Number.isInteger(value) && value >= 5 && value <= 100
      ? value
      : null;
  })();
  const initialCareerIsCustom = Boolean(
    initialProfile?.career && !POPULAR_CAREERS.some((career) => career.name === initialProfile.career)
  );

  const [step, setStep] = useState<number>(1);
  const [authMethod, setAuthMethod] = useState<'google' | 'phone' | 'guest'>(
    initialProfile?.authMethod || 'guest'
  );

  // Form State. La edad de un perfil nuevo es null: nunca se presupone que el
  // estudiante tiene 15 años (ni ninguna otra edad).
  const [name, setName] = useState<string>(initialProfile?.name || '');
  const [email, setEmail] = useState<string>(initialProfile?.email || '');
  const [phone, setPhone] = useState<string>(initialProfile?.phone || '');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [age, setAge] = useState<number | null>(validStoredAge);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [level, setLevel] = useState<AcademicLevel>(initialProfile?.level || 'secundaria');
  
  // Higher ed specific
  const [selectedCareer, setSelectedCareer] = useState<string>(
    initialCareerIsCustom ? 'Otra carrera...' : (initialProfile?.career || 'Medicina Humana')
  );
  const [customCareer, setCustomCareer] = useState<string>(
    initialCareerIsCustom ? (initialProfile?.career || '') : ''
  );
  const [semester, setSemester] = useState<string>(initialProfile?.semester || '4º Semestre');
  const [customSubject, setCustomSubject] = useState<string>(initialProfile?.subject || '');
  const [objective, setObjective] = useState<string>(
    initialProfile?.objective || 'Aprender a mi propio ritmo de forma práctica'
  );

  // El modal permanece montado para poder abrirlo desde cualquier módulo.
  // Al abrirlo de nuevo hay que recargar todos sus valores, especialmente la
  // edad, para no conservar el estado del formulario anterior.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setAuthMethod(initialProfile?.authMethod || 'guest');
    setName(initialProfile?.name || '');
    setEmail(initialProfile?.email || '');
    setPhone(initialProfile?.phone || '');
    setOtpSent(false);
    setAge(validStoredAge);
    setAgeError(null);
    setNameError(null);
    setLevel(initialProfile?.level || 'secundaria');
    setSelectedCareer(initialCareerIsCustom ? 'Otra carrera...' : (initialProfile?.career || 'Medicina Humana'));
    setCustomCareer(initialCareerIsCustom ? (initialProfile?.career || '') : '');
    setSemester(initialProfile?.semester || '4º Semestre');
    setCustomSubject(initialProfile?.subject || '');
    setObjective(initialProfile?.objective || 'Aprender a mi propio ritmo de forma práctica');
  }, [isOpen, initialProfile?.id, initialProfile?.name, initialProfile?.email, initialProfile?.phone,
    initialProfile?.authMethod, initialProfile?.age, initialProfile?.level, initialProfile?.career,
    initialProfile?.semester, initialProfile?.subject, initialProfile?.objective]);

  if (!isOpen) return null;

  // Selected level object
  const currentLevelInfo = ACADEMIC_LEVELS.find((l) => l.id === level) || ACADEMIC_LEVELS[1];
  const careerObj = POPULAR_CAREERS.find((c) => c.name === selectedCareer);

  const handleLevelSelect = (lvl: AcademicLevel) => {
    setLevel(lvl);
    const info = ACADEMIC_LEVELS.find((l) => l.id === lvl);
    if (info) {
      // La edad es una decisión del estudiante. El nivel solamente sugiere un
      // rango; nunca reemplaza una edad elegida ni inserta 15 automáticamente.
      if (lvl === 'primaria') {
        setCustomSubject(info.subjects[0] || 'Matemáticas Divertidas');
      } else if (lvl === 'secundaria') {
        setCustomSubject(info.subjects[0] || 'Matemáticas (Álgebra y Geometría)');
      } else if (lvl === 'universidad') {
        setSelectedCareer(initialCareerIsCustom ? 'Otra carrera...' : (initialProfile?.career || 'Medicina Humana'));
        setSemester(initialProfile?.semester || '4º Semestre');
        setCustomSubject('Farmacología General');
      } else if (lvl === 'posgrado') {
        setSelectedCareer(initialProfile?.career || 'Maestría en Ciencias Médicas / Especialidad Quirúrgica');
        setSemester(initialProfile?.semester || '2º Año');
        setCustomSubject('Metodología de Investigación y Tesis');
      } else {
        setCustomSubject(info.subjects[0] || 'Programación y Desarrollo Web');
      }
    }
  };

  const isValidAge = (value: number | null): value is number =>
    value !== null && Number.isInteger(value) && value >= 5 && value <= 100;

  const validateStepOne = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Escribe un nombre o apodo para iniciar tu clase.');
      valid = false;
    } else {
      setNameError(null);
    }
    if (!isValidAge(age)) {
      setAgeError('Selecciona tu edad (entre 5 y 100 años) antes de continuar.');
      valid = false;
    } else {
      setAgeError(null);
    }
    return valid;
  };

  const handleNext = () => {
    if (step === 1 && !validateStepOne()) return;
    setStep((current) => Math.min(current + 1, 3));
  };

  const handleFinish = () => {
    if (!isValidAge(age)) {
      setStep(1);
      setAgeError('Selecciona tu edad (entre 5 y 100 años) antes de guardar tu perfil.');
      return;
    }

    const finalCareer = level === 'universidad' 
      ? (selectedCareer === 'Otra carrera...' ? (customCareer || 'Carrera Universitaria') : selectedCareer)
      : (level === 'posgrado' ? selectedCareer : undefined);

    let finalSubject = customSubject.trim();
    if (!finalSubject) {
      if (level === 'primaria') finalSubject = 'Matemáticas Divertidas';
      else if (level === 'secundaria') finalSubject = 'Matemáticas (Álgebra)';
      else if (level === 'universidad') finalSubject = 'Materia troncal del semestre';
      else if (level === 'posgrado') finalSubject = 'Tesis y Marco Teórico';
      else finalSubject = 'Aprendizaje Práctico';
    }

    const newProfile: StudentProfile = {
      id: initialProfile?.id || `student_${Date.now()}`,
      name: name.trim() || (authMethod === 'google' ? 'Estudiante Google' : 'Estudiante'),
      email: authMethod === 'google' ? email : undefined,
      phone: authMethod === 'phone' ? phone : undefined,
      authMethod,
      age,
      ageConfirmed: true,
      level,
      career: finalCareer,
      semester: (level === 'universidad' || level === 'posgrado') ? semester : undefined,
      subject: finalSubject,
      objective: level === 'autodidacta' ? objective : undefined,
      avatarSeed: name || 'Tutor',
      createdAt: initialProfile?.createdAt || new Date().toISOString(),
    };

    onComplete(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto text-slate-800 dark:text-slate-100 transition-all">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner text-2xl border border-white/20">
                👨‍🏫
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                  Bienvenido a Profesor IA
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Configura tu Perfil de Estudio
                </h2>
              </div>
            </div>
            
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-white/70 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition"
              >
                Cerrar
              </button>
            )}
          </div>

          <p className="text-xs sm:text-sm text-indigo-100/90 mt-2">
            Tu tutor inteligente se adapta exactamente a tu edad, nivel académico y carrera para ayudarte con tareas, exámenes y dudas en tiempo real.
          </p>

          {/* Stepper progress */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/15 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-medium transition ${step === 1 ? 'bg-white text-indigo-700' : 'bg-white/20 text-white'}`}>
              1. Cuenta y Edad
            </span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className={`px-2.5 py-1 rounded-full font-medium transition ${step === 2 ? 'bg-white text-indigo-700' : 'bg-white/20 text-white'}`}>
              2. Nivel Académico
            </span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className={`px-2.5 py-1 rounded-full font-medium transition ${step === 3 ? 'bg-white text-indigo-700' : 'bg-white/20 text-white'}`}>
              3. Materia y Enfoque
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[min(72vh,calc(100dvh-2rem))] overflow-y-auto space-y-6">

          {/* STEP 1: Cuenta, Nombre y Edad */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Account Selection Method */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  1. Método de Acceso al Aula
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('google')}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition ${
                      authMethod === 'google'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center font-bold text-red-500 shrink-0">
                      G
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Perfil con correo</div>
                      <div className="text-slate-700 dark:text-slate-300 text-[11px]">Identificador local opcional</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMethod('phone')}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition ${
                      authMethod === 'phone'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Perfil con teléfono</div>
                      <div className="text-slate-700 dark:text-slate-300 text-[11px]">Guardado local</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMethod('guest')}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition ${
                      authMethod === 'guest'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">Acceso Inmediato</div>
                      <div className="text-slate-700 dark:text-slate-300 text-[11px]">Sin contraseña</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Account Credentials Details */}
              {authMethod === 'google' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Correo para identificar este perfil (opcional)</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu.correo@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {authMethod === 'phone' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Número de Teléfono Móvil
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+58 412 1234567"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setOtpSent(Boolean(phone.trim()))}
                        disabled={!phone.trim()}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold transition"
                      >
                        {otpSent ? 'Guardado ✓' : 'Guardar teléfono'}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <p className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                      El número se guardará solo en este dispositivo. Esta versión no envía SMS ni verifica cuentas externas.
                    </p>
                  )}
                </div>
              )}

              {/* Student Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre o Apodo del Estudiante *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="Ej: Daniel, Valeria, Roberto..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 block">
                  Así se dirigirá a ti tu Profesor IA en cada clase y explicación.
                </span>
                {nameError && (
                  <p role="alert" className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {nameError}
                  </p>
                )}
              </div>

              {/* Student Age */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label htmlFor="student-age" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    ¿Qué edad tienes? *
                  </label>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${age !== null ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                    {age !== null ? `${age} años` : 'Sin seleccionar'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                  Elige tu edad real. No se asumirá ninguna edad por ti.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-3">
                  <select
                    id="student-age"
                    required
                    value={age === null ? '' : String(age)}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      setAge(value);
                      setAgeError(null);
                    }}
                    aria-invalid={ageError ? 'true' : 'false'}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none ${ageError ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-300 dark:border-slate-700'}`}
                  >
                    <option value="" disabled>Selecciona tu edad</option>
                    {Array.from({ length: 96 }, (_, index) => index + 5).map((value) => (
                      <option key={value} value={value}>{value} años</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={100}
                    step={1}
                    value={age === null ? '' : age}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setAge(null);
                        setAgeError(null);
                        return;
                      }
                      const value = Number(raw);
                      if (Number.isFinite(value)) {
                        setAge(Math.min(100, Math.max(5, Math.round(value))));
                        setAgeError(null);
                      }
                    }}
                    placeholder="Ej. 15"
                    aria-label="Escribir edad"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {ageError && (
                  <p role="alert" className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {ageError}
                  </p>
                )}

                {/* Atajos opcionales; no cambian la edad detrás de tu espalda. */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-slate-700 dark:text-slate-300 py-1">Atajos:</span>
                  {[8, 11, 14, 17, 20, 24, 32].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAge(value);
                        setAgeError(null);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                        age === value
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {value} años
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Nivel Académico ("Sitio Académico") */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ¿En qué sitio académico te encuentras? *
                </label>
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">
                  Selecciona tu nivel para calibrar la pedagogía, la dificultad y la forma en que el Profesor IA resolverá tus dudas.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {ACADEMIC_LEVELS.map((lvl) => {
                  const isSelected = level === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleLevelSelect(lvl.id)}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-indigo-500/30 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {lvl.id === 'primaria' && '🎒'}
                        {lvl.id === 'secundaria' && '🏫'}
                        {lvl.id === 'universidad' && '🎓'}
                        {lvl.id === 'posgrado' && '🏛️'}
                        {lvl.id === 'autodidacta' && '💡'}
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {lvl.title}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {lvl.ageRange}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {lvl.description}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Configuración Específica según Nivel */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* CASO: PRIMARIA */}
              {level === 'primaria' && (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎒</span>
                    <div>
                      <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                        Modo Profesor de Primaria Activo
                      </h4>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                        El profesor sabe de todas las materias básicas y explicará paso a paso con historias, analogías y refuerzo positivo.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ¿Con qué materia quieres empezar hoy?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentLevelInfo.subjects.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setCustomSubject(sub)}
                          className={`text-xs p-2.5 rounded-xl border text-left font-medium transition ${
                            customSubject === sub
                              ? 'bg-amber-500 text-white border-amber-500 shadow'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CASO: SECUNDARIA */}
              {level === 'secundaria' && (
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏫</span>
                    <div>
                      <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm sm:text-base">
                        Modo Profesor de Liceo / Secundaria
                      </h4>
                      <p className="text-xs text-blue-800/80 dark:text-blue-300/80">
                        Amplitud en materias científicas y humanistas. Preparación de exámenes con razonamiento detallado.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Elige tu Asignatura de Estudio:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentLevelInfo.subjects.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setCustomSubject(sub)}
                          className={`text-xs p-2.5 rounded-xl border text-left font-medium transition ${
                            customSubject === sub
                              ? 'bg-blue-600 text-white border-blue-600 shadow'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CASO: UNIVERSIDAD (Carrera + Semestre + Materia) */}
              {level === 'universidad' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center gap-3">
                    <span className="text-3xl">🎓</span>
                    <div>
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                        Configuración de Cátedra Universitaria
                      </h4>
                      <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
                        El profesor dominará todo el pensum semestral de tu carrera con terminología técnica rigurosa.
                      </p>
                    </div>
                  </div>

                  {/* Career selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      1. Selecciona tu Carrera Universitaria *
                    </label>
                    <select
                      value={selectedCareer}
                      onChange={(e) => {
                        setSelectedCareer(e.target.value);
                        // update default subject for that career
                        const c = POPULAR_CAREERS.find((x) => x.name === e.target.value);
                        if (c && c.semesterSubjects[4]) {
                          setCustomSubject(c.semesterSubjects[4][0] || '');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {POPULAR_CAREERS.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.category})
                        </option>
                      ))}
                      <option value="Otra carrera...">Otra carrera universitaria...</option>
                    </select>

                    {selectedCareer === 'Otra carrera...' && (
                      <input
                        type="text"
                        value={customCareer}
                        onChange={(e) => setCustomCareer(e.target.value)}
                        placeholder="Escribe el nombre de tu carrera (ej. Biotecnología, Odontología...)"
                        className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    )}
                  </div>

                  {/* Semester selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        2. Semestre / Ciclo Actual *
                      </label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                          <option key={s} value={`${s}º Semestre`}>
                            {s}º Semestre / Ciclo
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        3. Materia o Asignatura de Enfoque *
                      </label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Ej: Farmacología, Cálculo III, Derecho Penal..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Prepopulated subjects for popular career */}
                  {careerObj && (
                    <div>
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                        Materias sugeridas de {careerObj.name}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.values(careerObj.semesterSubjects)
                          .flat()
                          .slice(0, 8)
                          .map((sub) => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setCustomSubject(sub)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                                customSubject === sub
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CASO: POSGRADO */}
              {level === 'posgrado' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-center gap-3">
                    <span className="text-3xl">🏛️</span>
                    <div>
                      <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm">
                        Tutoría de Posgrado e Investigación
                      </h4>
                      <p className="text-xs text-purple-800/80 dark:text-purple-300/80">
                        Discusión científica avanzada, rigor metodológico y literatura de frontera.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Área o Programa de Posgrado:
                    </label>
                    <select
                      value={selectedCareer}
                      onChange={(e) => setSelectedCareer(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {POSGRADO_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tema de Tesis, Materia o Proyecto:
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Ej: Análisis bioestadístico y diseño experimental para tesis..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CASO: AUTODIDACTA */}
              {level === 'autodidacta' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3">
                    <span className="text-3xl">💡</span>
                    <div>
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                        Modo Aprendiz Libre y Autodidacta
                      </h4>
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                        Aprende sin notas ni exámenes tradicionales: explicaciones directas, prácticas y motivadoras.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ¿Qué te apasiona o quieres dominar?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentLevelInfo.subjects.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setCustomSubject(sub)}
                          className={`text-xs p-2.5 rounded-xl border text-left font-medium transition ${
                            customSubject === sub
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tu Meta Personal:
                    </label>
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Ej: Poder crear mis propias páginas web en 3 meses"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Summary Card Before Completing */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                    Resumen de tu profesor:
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {name || 'Estudiante'} • {age !== null ? `${age} años` : 'Edad por seleccionar'} • {currentLevelInfo.badge}
                  </div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    Materia: {customSubject || 'General'}
                    {level === 'universidad' && ` • ${selectedCareer} (${semester})`}
                  </div>
                </div>
                <div className="text-2xl">✨</div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold transition"
            >
              ← Volver
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-indigo-500/25"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold transition shadow-lg shadow-emerald-600/30 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>¡Comenzar a Estudiar!</span>
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
