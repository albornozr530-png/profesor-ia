import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaManager: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    let registration: ServiceWorkerRegistration | undefined;
    const register = async () => {
      if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
      try {
        const base = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`;
        registration = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
        if (registration.waiting) setUpdateReady(true);
        registration.addEventListener('updatefound', () => {
          const installing = registration?.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      } catch (error) {
        console.warn('No se pudo registrar el service worker:', error);
      }
    };
    void register();

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      void registration?.update();
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const update = async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  if (!installPrompt && !updateReady && isOnline) return null;

  return (
    <div className="fixed bottom-3 left-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <div className="min-w-0 flex-1 text-xs text-slate-700 dark:text-slate-200">
          {!isOnline
            ? 'Estás sin conexión. Puedes seguir usando las funciones locales.'
            : updateReady
            ? 'Hay una actualización disponible para Profesor IA.'
            : 'Instala Profesor IA para abrirla como una aplicación.'}
        </div>
        {!isOnline ? null : updateReady ? (
          <button type="button" onClick={() => void update()} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white">Actualizar</button>
        ) : installPrompt ? (
          <button type="button" onClick={() => void install()} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white">Instalar</button>
        ) : null}
      </div>
    </div>
  );
};
