import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as NativeSpeechRecognition } from '@capacitor-community/speech-recognition';
import { transcribeAudioBlob } from './api';

export interface DictationCallbacks {
  onText: (text: string) => void;
  onStateChange: (listening: boolean) => void;
  onError: (message: string) => void;
}

export interface DictationController {
  stop: () => Promise<void>;
  dispose: () => Promise<void>;
}

interface WebSpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getWebRecognitionConstructor(): (new () => WebSpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const constructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return typeof constructor === 'function' ? constructor : null;
}

function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code || '')
    : '';

  if (name === 'NotAllowedError' || name === 'SecurityError' || code === 'PERMISSION_DENIED') {
    return 'Permiso de micrófono denegado. Habilítalo en los permisos del navegador o de la aplicación.';
  }
  if (name === 'NotFoundError' || code === 'NO_MICROPHONE') {
    return 'No se encontró ningún micrófono conectado.';
  }
  if (name === 'NotReadableError' || code === 'MICROPHONE_BUSY') {
    return 'El micrófono está siendo utilizado por otra aplicación. Ciérrala e inténtalo de nuevo.';
  }
  if (name === 'AbortError') {
    return 'Se interrumpió el acceso al micrófono.';
  }
  return 'No se pudo activar el micrófono. Revisa los permisos del dispositivo.';
}

async function getMicrophoneStream(): Promise<MediaStream> {
  if (typeof window === 'undefined') throw new Error('El micrófono no está disponible en este entorno.');
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    throw new Error('El micrófono requiere HTTPS (o ejecutarse en localhost).');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Este entorno no permite capturar audio del micrófono.');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  });
}

async function requestWebMicrophone(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    // Algunos navegadores con Web Speech no exponen getUserMedia. La propia
    // SpeechRecognition seguirá pidiendo el permiso cuando sea posible.
    return;
  }
  const stream = await getMicrophoneStream();
  stream.getTracks().forEach((track) => track.stop());
}

export async function isDictationAvailable(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const result = await NativeSpeechRecognition.available();
      if (result.available === true) return true;
    } catch {
      // Se intentará MediaRecorder como fallback.
    }
  }
  if (getWebRecognitionConstructor() !== null) return true;
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

async function startRecorderFallback(callbacks: DictationCallbacks): Promise<DictationController> {
  const stream = await getMicrophoneStream();
  const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  let disposed = false;
  let resolveStopped: (() => void) | undefined;
  const stopped = new Promise<void>((resolve) => { resolveStopped = resolve; });

  const stopTracks = () => stream.getTracks().forEach((track) => track.stop());
  const maxDuration = window.setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop();
  }, 30_000);
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.onerror = () => {
    callbacks.onError('No se pudo grabar el audio del micrófono.');
    callbacks.onStateChange(false);
    window.clearTimeout(maxDuration);
    stopTracks();
    resolveStopped?.();
  };
  recorder.onstop = async () => {
    stopTracks();
    window.clearTimeout(maxDuration);
    callbacks.onStateChange(false);
    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
      if (blob.size < 256) {
        callbacks.onError('No se grabó voz. Mantén pulsado el micrófono y habla con claridad.');
        return;
      }
      try {
        const result = await transcribeAudioBlob(blob);
        if (result.text) callbacks.onText(result.text);
        else callbacks.onError('No se obtuvo texto del audio grabado.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo transcribir el audio.';
        callbacks.onError(message);
      }
    } finally {
      resolveStopped?.();
    }
  };

  recorder.start(250);
  callbacks.onStateChange(true);

  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    try {
      if (recorder.state !== 'inactive') recorder.stop();
      else {
        stopTracks();
        resolveStopped?.();
      }
    } catch {
      stopTracks();
      resolveStopped?.();
    }
    await stopped;
  };

  return {
    stop: dispose,
    dispose,
  };
}

export async function startDictation(callbacks: DictationCallbacks): Promise<DictationController> {
  if (isNativePlatform()) {
    try {
      const available = await NativeSpeechRecognition.available();
      if (!available.available) throw new Error('NATIVE_SPEECH_UNAVAILABLE');

      const permission = await NativeSpeechRecognition.checkPermissions();
      let granted = permission.speechRecognition === 'granted';
      if (!granted) {
        const requested = await NativeSpeechRecognition.requestPermissions();
        granted = requested.speechRecognition === 'granted';
      }
      if (!granted) {
        callbacks.onError('Permiso de micrófono denegado en la aplicación.');
        throw new Error('NATIVE_PERMISSION_DENIED');
      }

      const partialListener = await NativeSpeechRecognition.addListener('partialResults', ({ matches }: { matches?: string[] }) => {
        const text = matches?.filter(Boolean).join(' ').trim();
        if (text) callbacks.onText(text);
      });
      const stateListener = await NativeSpeechRecognition.addListener('listeningState', ({ status }: { status: string }) => {
        callbacks.onStateChange(status === 'started');
      });

      let disposed = false;
      const cleanup = async () => {
        if (disposed) return;
        disposed = true;
        await Promise.allSettled([partialListener.remove(), stateListener.remove()]);
        callbacks.onStateChange(false);
      };

      try {
        callbacks.onStateChange(true);
        const result = await NativeSpeechRecognition.start({
          language: 'es-ES',
          maxResults: 1,
          prompt: 'Habla con claridad',
          partialResults: true,
          popup: false,
        });
        const finalText = result.matches?.filter(Boolean).join(' ').trim();
        if (finalText) callbacks.onText(finalText);
      } catch (error) {
        await cleanup();
        throw error;
      }

      return {
        stop: async () => {
          try {
            await NativeSpeechRecognition.stop();
          } catch {
            // Si el servicio ya terminó, limpiar listeners sigue siendo seguro.
          }
          await cleanup();
        },
        dispose: cleanup,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'NATIVE_PERMISSION_DENIED') {
        throw error;
      }
      // Si el motor nativo no está instalado o no tiene servicio, se usa la
      // grabación real + transcripción del servidor cuando esté configurada.
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        const message = 'El servicio de voz nativo no está disponible en este dispositivo.';
        callbacks.onError(message);
        throw new Error(message);
      }
      return startRecorderFallback(callbacks);
    }
  }

  const Recognition = getWebRecognitionConstructor();
  if (!Recognition) {
    try {
      return await startRecorderFallback(callbacks);
    } catch (error) {
      const message = errorMessage(error);
      callbacks.onError(message);
      throw error;
    }
  }

  try {
    await requestWebMicrophone();
  } catch (error) {
    const message = errorMessage(error);
    callbacks.onError(message);
    throw error;
  }

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'es-ES';
  recognition.maxAlternatives = 1;
  let disposed = false;

  recognition.onstart = () => callbacks.onStateChange(true);
  recognition.onresult = (event: any) => {
    let finalText = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) finalText += `${result[0]?.transcript || ''} `;
    }
    const text = finalText.trim();
    if (text) callbacks.onText(text);
  };
  recognition.onerror = (event: any) => {
    const code = String(event?.error || '');
    if (code === 'no-speech') {
      callbacks.onError('No se detectó voz. Intenta hablar de nuevo.');
    } else if (code === 'audio-capture') {
      callbacks.onError('No se encontró un micrófono disponible.');
    } else if (code === 'not-allowed' || code === 'service-not-allowed') {
      callbacks.onError('Permiso de micrófono denegado. Habilítalo en los permisos del navegador.');
    } else {
      callbacks.onError(`Error de reconocimiento de voz${code ? `: ${code}` : '.'}`);
    }
    callbacks.onStateChange(false);
  };
  recognition.onend = () => callbacks.onStateChange(false);

  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    try {
      recognition.abort();
    } catch {
      // ignore
    }
    callbacks.onStateChange(false);
  };

  try {
    recognition.start();
  } catch (error) {
    await dispose();
    callbacks.onError(errorMessage(error));
    throw error;
  }

  return {
    stop: async () => {
      try {
        recognition.stop();
      } catch {
        await dispose();
      }
    },
    dispose,
  };
}
