import './env.js'

/**
 * Transcripción de audio opcional.
 *
 * La interfaz usa reconocimiento nativo/Web Speech cuando está disponible.
 * Este endpoint es el fallback para navegadores sin SpeechRecognition. La
 * clave nunca se envía al cliente: se configura únicamente en el servidor.
 */
const DEFAULT_TRANSCRIPTION_URL = 'https://gen.pollinations.ai/v1/audio/transcriptions';

export function transcriptionConfigured() {
  return Boolean(process.env.TRANSCRIPTION_API_URL || process.env.POLLINATIONS_API_KEY);
}

export async function transcribeAudio(audioBuffer, { mimeType = 'audio/webm', language = 'es' } = {}) {
  const endpoint = process.env.TRANSCRIPTION_API_URL || (process.env.POLLINATIONS_API_KEY ? DEFAULT_TRANSCRIPTION_URL : '');
  if (!endpoint) {
    const error = new Error('La transcripción de audio no está configurada en el servidor.');
    error.code = 'TRANSCRIPTION_NOT_CONFIGURED';
    throw error;
  }
  if (!audioBuffer?.length) {
    const error = new Error('No se recibió audio.');
    error.code = 'EMPTY_AUDIO';
    throw error;
  }

  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: mimeType }), 'dictado.webm');
  form.append('model', process.env.TRANSCRIPTION_MODEL || 'openai/whisper-large-v3');
  form.append('language', language);

  const headers = {};
  if (process.env.POLLINATIONS_API_KEY) {
    headers.Authorization = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }
  if (process.env.TRANSCRIPTION_API_KEY) {
    headers.Authorization = `Bearer ${process.env.TRANSCRIPTION_API_KEY}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.TRANSCRIPTION_TIMEOUT_MS) || 90_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      const error = new Error(`Proveedor de transcripción respondió ${response.status}.`);
      error.code = 'TRANSCRIPTION_PROVIDER_ERROR';
      error.detail = raw.slice(0, 300);
      throw error;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      const error = new Error('El proveedor de transcripción devolvió una respuesta inválida.');
      error.code = 'TRANSCRIPTION_INVALID_RESPONSE';
      throw error;
    }
    return {
      text: String(data.text || data.transcript || '').trim(),
      language: data.language || language,
      durationMs: Number(data.duration_ms || data.durationMs) || undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}
