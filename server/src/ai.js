import './env.js'

// IA configurable. El servidor mantiene la compatibilidad con el gateway
// legacy sin clave, pero permite migrar al endpoint oficial mediante
// POLLINATIONS_API_URL y POLLINATIONS_API_KEY.
import { webSearch } from './search.js'

const hasKey = Boolean(process.env.POLLINATIONS_API_KEY)
const POLLI_BASE = (process.env.POLLINATIONS_API_URL || (hasKey ? 'https://gen.pollinations.ai/v1' : 'https://text.pollinations.ai/openai')).replace(/\/$/, '')
const POLLI_TEXT = POLLI_BASE.endsWith('/openai') || POLLI_BASE.endsWith('/chat/completions')
  ? POLLI_BASE
  : `${POLLI_BASE}/chat/completions`
const POLLI_IMAGE = process.env.POLLINATIONS_IMAGE_URL || 'https://image.pollinations.ai/prompt/'
const MODEL = process.env.POLLINATIONS_MODEL || (hasKey ? 'openai/gpt-5.4-nano' : 'openai')
const REQUEST_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 90_000

export async function callPollinations(messages, { json = false } = {}) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  }
  if (json) body.response_format = { type: 'json_object' }

  const headers = { 'Content-Type': 'application/json' }
  if (process.env.POLLINATIONS_API_KEY) {
    headers.Authorization = `Bearer ${process.env.POLLINATIONS_API_KEY}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(POLLI_TEXT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Pollinations ${res.status}: ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    const message = data?.choices?.[0]?.message
    const content = Array.isArray(message?.content)
      ? message.content.map((part) => typeof part === 'string' ? part : part?.text || '').join('')
      : message?.content
    if (!content) throw new Error('Respuesta vacía de Pollinations')
    return content
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('El motor de IA tardó demasiado en responder.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

// Genera una imagen didáctica (diagramas, ilustraciones) sin API key en el
// gateway legacy; una instalación productive puede sustituir la URL por su
// proveedor de imágenes.
export async function generateImage(prompt) {
  const url = `${POLLI_IMAGE}${encodeURIComponent(prompt)}?width=768&height=512&nologo=true`
  return url
}

function buildSystemPrompt(profile, mode, searchResults) {
  const level = profile?.level ? `Nivel académico: ${profile.level}${profile.detail ? ` (${profile.detail})` : ''}.` : ''
  const semester = profile?.semester ? `Semestre en curso: ${profile.semester} — enfócate en las materias y contenidos que se ven en este punto de la carrera.` : ''
  const age = profile?.age ? `Edad del estudiante: ${profile.age} años.` : ''
  const modePrompt = mode?.prompt || ''
  const searchBlock = searchResults
    ? `\n\nRESULTADOS DE BÚSQUEDA WEB RECIENTES (úsalos si son relevantes y cita la fuente con la URL):\n${searchResults
        .map((r) => `- ${r.title}: ${r.snippet} (${r.url})`)
        .join('\n')}`
    : ''

  return `Eres "Profesor IA", un profesor experto y dedicado que ayuda a estudiantes de cualquier nivel.
Fecha actual del sistema: ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date())}. Verifica los eventos dependientes del tiempo.
${age}
${level}
${semester}
${modePrompt}
Reglas generales:
- Responde SIEMPRE en español, en el idioma/tono adecuado al nivel del estudiante.
- Usa formato Markdown: títulos, listas, **negritas**, fórmulas, tablas cuando ayuden.
- Sé pedagógico: explica paso a paso, verifica la comprensión, pregunta si algo no quedó claro.
- Si el estudiante pide verificar un ejercicio, revisa con lupa cada paso y señala errores exactos.
- Si no sabes algo con certeza, dilo y sugiere cómo averiguarlo.${searchBlock}`
}

export async function chat({ profile, mode, messages, useWeb }) {
  // 1) Si el usuario activó búsqueda web, buscamos el último mensaje del estudiante
  let searchResults = null
  let searchInfo = null
  if (useWeb) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) {
      const { extractQuery } = await import('./search.js').catch(() => ({}))
      const query = lastUser.content.slice(0, 200)
      const found = await webSearch(query)
      if (found) {
        searchResults = found.results
        searchInfo = { engine: found.engine, results: found.results.slice(0, 3) }
      }
    }
  }

  const system = buildSystemPrompt(profile, mode, searchResults)
  const fullMessages = [{ role: 'system', content: system }, ...messages.slice(-16)]

  const content = await callPollinations(fullMessages)
  return { content, search: searchInfo }
}
