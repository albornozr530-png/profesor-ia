import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Globe, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Trash2, 
  ArrowUpRight, 
  ExternalLink,
  HelpCircle,
  Lightbulb,
  GraduationCap,
  Mic,
  MicOff,
  AlertCircle
} from 'lucide-react';
import { StudentProfile, ChatMessage } from '../types';
import { sendChatMessage } from '../utils/api';
import { getStoredChat, saveStoredChat } from '../utils/storage';
import { isDictationAvailable, startDictation, DictationController } from '../utils/speech';
import { SAMPLE_PROMPTS_BY_LEVEL, ACADEMIC_LEVELS } from '../utils/academicPresets';

interface ChatTutorProps {
  profile: StudentProfile;
  onSendToReview?: (text: string) => void;
}

export const ChatTutor: React.FC<ChatTutorProps> = ({ profile, onSendToReview }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useSearch, setUseSearch] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dictado universal: Web Speech en navegador/Electron y plugin nativo en Android.
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isStartingDictation, setIsStartingDictation] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const dictationRef = useRef<DictationController | null>(null);
  const requestIdRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const levelInfo = ACADEMIC_LEVELS.find((l) => l.id === profile.level) || ACADEMIC_LEVELS[1];
  const samplePrompts = SAMPLE_PROMPTS_BY_LEVEL[profile.level] || SAMPLE_PROMPTS_BY_LEVEL.secundaria;
  // Cambiar de edad/nivel crea un contexto de conversación nuevo para no
  // reutilizar respuestas adaptadas a otro perfil.
  const chatContext = `${profile.subject || 'General'}::${profile.level}::${profile.age}`;

  // Comprueba el soporte sin crear una conexión de micrófono al cargar la
  // pantalla: el permiso se solicita únicamente cuando el usuario pulsa el micrófono.
  useEffect(() => {
    let mounted = true;
    isDictationAvailable()
      .then((available) => {
        if (mounted) setIsSpeechSupported(available);
      })
      .catch(() => {
        if (mounted) setIsSpeechSupported(false);
      });

    return () => {
      mounted = false;
      void dictationRef.current?.dispose();
      dictationRef.current = null;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = async () => {
    if (isListening || isStartingDictation) {
      try {
        await dictationRef.current?.stop();
      } finally {
        dictationRef.current = null;
        setIsListening(false);
      }
      return;
    }

    if (!isSpeechSupported) {
      setSpeechError('El dictado no está disponible en este entorno. Usa Chrome, Edge, Opera o la aplicación Android.');
      return;
    }

    setSpeechError(null);
    setIsStartingDictation(true);
    try {
      await dictationRef.current?.dispose();
      dictationRef.current = null;
      const controller = await startDictation({
        onText: (text) => {
          setInputText((previous) => {
            const current = previous.trim();
            return current ? `${current} ${text.trim()}` : text.trim();
          });
        },
        onStateChange: (listening) => setIsListening(listening),
        onError: (message) => {
          setSpeechError(message);
          setIsListening(false);
        },
      });
      dictationRef.current = controller;
    } catch (error) {
      console.error('No se pudo iniciar el dictado:', error);
      setIsListening(false);
    } finally {
      setIsStartingDictation(false);
    }
  };

  // Load chat on profile / subject / age change
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setIsLoading(false);
    setInputText('');
    void dictationRef.current?.dispose();
    dictationRef.current = null;
    setIsListening(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const stored = getStoredChat(profile.id, chatContext);
    if (stored && stored.length > 0) {
      setMessages(stored);
    } else {
      // Create initial welcoming greeting tailored to level
      let welcomeContent = '';
      if (profile.level === 'primaria') {
        welcomeContent = `¡Hola, ${profile.name}! 🌟 ¡Qué alegría tenerte en clase! Soy tu Profesor IA de Primaria. Aquí podemos resolver tus tareas de ${profile.subject || 'cualquier materia'}, aprender jugando y revisar todos tus ejercicios para que saques una carita feliz. ¿Qué te gustaría que aprendamos o revisemos hoy?`;
      } else if (profile.level === 'secundaria') {
        welcomeContent = `¡Hola, ${profile.name}! Bienvenido a tu sesión de ${profile.subject || 'secundaria'}. Soy tu Profesor IA. Estoy listo para ayudarte con explicaciones paso a paso, trucos para recordar fórmulas y conceptos, y la preparación para tus exámenes. ¿Qué tema o duda estás estudiando ahora?`;
      } else if (profile.level === 'universidad') {
        welcomeContent = `Estimado/a ${profile.name}, bienvenido a la cátedra de ${profile.subject || profile.career || 'Nivel Universitario'}. Me enfocaré en el rigor académico de ${profile.career ? `${profile.career} (${profile.semester || 'semestre actual'})` : 'tu formación superior'}. Cuento con razonamiento analítico avanzado y capacidad de búsqueda de bibliografía en tiempo real. ¿Qué tema o caso de estudio deseas analizar?`;
      } else if (profile.level === 'posgrado') {
        welcomeContent = `Saludos cordiales, ${profile.name}. Como tutor de investigación y posgrado en ${profile.career || 'su área científica'}, estoy a su disposición para discutir marcos metodológicos, literatura especializada, diseño experimental o redacción académica. ¿En qué aspecto de su proyecto o tesis profundizaremos?`;
      } else {
        welcomeContent = `¡Hola ${profile.name}! Me alegra acompañarte en tu ruta de aprendizaje autodidacta sobre ${profile.subject || 'nuevas habilidades'}. Aquí no hay presión ni calificaciones: vamos a ir paso a paso, con ejemplos reales y directos al grano. ¿Por dónde te gustaría empezar?`;
      }

      const initialGreeting: ChatMessage = {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date().toISOString(),
      };
      setMessages([initialGreeting]);
      saveStoredChat(profile.id, chatContext, [initialGreeting]);
    }
  }, [profile.id, chatContext, profile.level, profile.career, profile.age]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isLoading) return;
    const requestId = ++requestIdRef.current;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        profile,
        useSearch
      );

      if (requestId !== requestIdRef.current) return;

      const assistantMessage: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString(),
        sources: response.sources,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveStoredChat(profile.id, chatContext, finalMessages);
    } catch (err: any) {
      console.error('Chat error:', err);
      if (requestId !== requestIdRef.current) return;
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: 'Ocurrió una interrupción temporal al consultar a tu profesor. Por favor intenta de nuevo en unos segundos.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isListening || isStartingDictation) await toggleListening();
      await handleSendMessage();
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API no disponible');
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.warn('No se pudo copiar el texto:', error);
      setSpeechError('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  };

  const handleClearChat = () => {
    if (window.confirm('¿Deseas reiniciar esta conversación con tu profesor?')) {
      requestIdRef.current += 1;
      setIsLoading(false);
      void dictationRef.current?.dispose();
      dictationRef.current = null;
      setIsListening(false);
      const resetMsg: ChatMessage = {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        content: `Conversación reiniciada. ¿Qué nuevo tema de ${profile.subject} deseas que exploremos hoy, ${profile.name}?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([resetMsg]);
      saveStoredChat(profile.id, chatContext, [resetMsg]);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  const handleSpeakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith('es')) || null;
    utterance.rate = profile.level === 'primaria' ? 0.95 : 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col max-w-5xl mx-auto w-full p-2 sm:p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      
      {/* Top Banner / Subject Info & Search Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
            {profile.level === 'primaria' && '🎒'}
            {profile.level === 'secundaria' && '🏫'}
            {profile.level === 'universidad' && '🎓'}
            {profile.level === 'posgrado' && '🏛️'}
            {profile.level === 'autodidacta' && '💡'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {profile.subject || 'Tutoría General'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {levelInfo.badge} • {profile.age} años
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {profile.level === 'universidad' && profile.career
                ? `${profile.career} • ${profile.semester || 'Semestre en curso'}`
                : levelInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls: Web Search & Clear */}
        <div className="flex items-center gap-2">
          
          {/* Web Search Toggle */}
          <button
            type="button"
            onClick={() => setUseSearch(!useSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              useSearch
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Activar para que el profesor consulte fuentes web recientes"
          >
            <Globe className={`w-3.5 h-3.5 ${useSearch ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Búsqueda web en vivo</span>
            <span className="sm:hidden">Web</span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${useSearch ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {useSearch ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Audio toggle if speaking */}
          {isSpeaking && (
            <button
              type="button"
              onClick={() => handleSpeakText('')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-100 text-red-700 text-xs font-semibold animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Detener voz</span>
            </button>
          )}

          {/* Clear button */}
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 text-slate-600 hover:text-red-500 rounded-lg transition"
            title="Reiniciar conversación"
          >
            <Trash2 className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 space-y-4">
        
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shrink-0 shadow text-sm font-bold mt-1">
                  👨‍🏫
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed transition ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
                }`}
              >
                {/* Author Label & Time */}
                <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-75">
                  <span className="font-semibold">
                    {isUser ? profile.name : 'Profesor IA'}
                  </span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Formatted Text Content */}
                <div className="whitespace-pre-wrap font-sans text-sm sm:text-[14.5px] leading-relaxed">
                  {msg.content}
                </div>

                {/* Grounding Sources (if Google Search was used) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                      <Globe className="w-3 h-3 text-blue-500" /> Fuentes consultadas en la web:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.slice(0, 3).map((s, idx) => (
                        <a
                          key={idx}
                          href={s.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:underline max-w-[220px] truncate"
                        >
                          <span className="truncate">{s.title || 'Fuente web'}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant Message Actions */}
                {!isUser && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                    
                    <button
                      type="button"
                      onClick={() => handleSpeakText(msg.content)}
                      className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      title="Escuchar explicación del profesor"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Escuchar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      title="Copiar texto"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[11px] text-emerald-500">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copiar</span>
                        </>
                      )}
                    </button>

                    {onSendToReview && (
                      <button
                        type="button"
                        onClick={() => onSendToReview(msg.content)}
                        className="flex items-center gap-1 ml-auto text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-semibold"
                      >
                        <span>Revisar como ejercicio</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-9 h-9 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow animate-pulse">
              👨‍🏫
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
              <span>
                El profesor está pensando y razonando la mejor explicación para tu nivel...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pill Carousel */}
      <div className="mt-2 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
            <Lightbulb className="w-3 h-3 text-amber-500" /> Sugerencias:
          </span>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(prompt.replace(/^[^\w\s]+/, '').trim())}
              className="shrink-0 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 text-[11px] transition shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Speech Recognition Error Banner */}
      {speechError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-xs hover:underline ml-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Message Input Box */}
      <div className="mt-2 relative">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (isListening || isStartingDictation) {
              await toggleListening();
            }
            await handleSendMessage();
          }}
          className={`flex items-end gap-2 bg-white dark:bg-slate-900 border rounded-2xl p-2 shadow-lg transition ${
            isListening
              ? 'border-red-500 ring-2 ring-red-400/30'
              : 'border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500'
          }`}
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? '🎙️ Dictando en vivo... Habla con claridad (tu voz se convertirá en texto aquí)'
                : `Pregúntale a tu profesor sobre ${profile.subject || 'tu materia'}... (Enter para enviar, Shift+Enter para salto de línea)`
            }
            className="flex-1 bg-transparent resize-none border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 p-1"
          />

          {/* Web Speech Dictate Button */}
          <button
            type="button"
            onClick={() => void toggleListening()}
            aria-label={isListening ? 'Detener dictado por voz' : 'Dictar pregunta por voz'}
            title={
              !isSpeechSupported
                ? 'Dictado no disponible en este entorno'
                : isListening
                ? 'Detener dictado por voz'
                : 'Dictar pregunta por voz'
            }
            disabled={isStartingDictation}
            className={`p-3 rounded-xl font-bold transition shadow-sm shrink-0 flex items-center justify-center relative ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isListening ? (
              <>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
                <MicOff className="w-4 h-4 text-white" />
              </>
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold transition shadow-md shrink-0 flex items-center justify-center"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 mt-1 px-1">
          <div className="flex items-center gap-2">
            <span>
              {profile.level === 'primaria'
                ? 'Consejo: Puedes preguntarle cualquier duda de tu tarea o dictársela con el micrófono.'
                : profile.level === 'universidad'
                ? `Enfoque activo: ${profile.career || 'Universidad'} • Semestre ${profile.semester || 'actual'}.`
                : 'Respuestas adaptadas a tu nivel académico y ritmo de estudio.'}
            </span>
            {isListening && (
              <span className="inline-flex items-center gap-1 text-red-500 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Escuchando dictado...
              </span>
            )}
          </div>
          {useSearch && (
            <span className="text-blue-500 font-semibold flex items-center gap-1">
              <Globe className="w-3 h-3" /> Búsqueda web activa
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
