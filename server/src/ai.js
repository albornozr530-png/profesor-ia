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
// Modelo con mayor capacidad de razonamiento y respuestas profundas. El
// "nano" anterior cortaba y daba explicaciones superficiales.
const MODEL = process.env.POLLINATIONS_MODEL || (hasKey ? 'openai/gpt-5.4-mini' : 'openai')
const REQUEST_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 90_000

// Sin límite artificial de tokens: el profesor explica con la profundidad
// que el tema requiera. Solo se envía max_tokens si se configura a propósito.
const MAX_TOKENS = process.env.AI_MAX_TOKENS ? Number(process.env.AI_MAX_TOKENS) : null

// El gateway gratuito de Pollinations corta las respuestas alrededor de
// ~3100 caracteres (finish_reason: "length") sin importar max_tokens. Para
// garantizar explicaciones completas y profundas, cuando se detecta un corte
// se pide automáticamente una continuación que empiece exactamente donde
// quedó el texto, y se une todo en una sola respuesta.
const CONTINUATION_MAX_CALLS = Number(process.env.AI_CONTINUATION_MAX_CALLS) || 3

function looksTruncated(text) {
  if (!text) return false
  const t = text.trim()
  // Terminación "limpia": fin de frase, lista, tabla, bloque de código o cierre.
  return !/([.!?…»"]|\*\*|```|\)|\])\s*$/.test(t)
}

function buildContinuationMessages(messages, partialText) {
  const continuationPrompt = `Tu respuesta anterior quedó cortada a mitad de frase. Continúa EXACTAMENTE donde te quedaste, sin repetir nada de lo ya escrito, sin saludos ni introducciones, sin volver a explicar lo anterior. Retoma la frase incompleta y completa la explicación hasta terminarla por completo.`
  const assistantMsg = { role: 'assistant', content: partialText }
  return [...messages, assistantMsg, { role: 'user', content: continuationPrompt }]
}

function joinText(head, tail) {
  // Une el fragmento previo con la continuación evitando duplicar espacios
  // o saltos de línea en la costura.
  return head.replace(/\s+$/, '') + tail.replace(/^\s+/, ' ')
}

// Convierte Markdown a texto natural fluido. Los modelos están entrenados con
// Markdown y a menudo lo usan aunque se les pida lo contrario; esta limpieza
// determinista garantiza que el estudiante nunca vea **asteriscos** ni ## barras.
export function markdownToPlain(text) {
  if (!text) return text
  let t = text
  // Bloques de código: se conservan (son contenido real), sin las cercas ```
  t = t.replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, (_m, code) => `\n${code.trim()}\n`)
  // Negritas y cursivas: **texto**, __texto__, *texto*, _texto_ -> texto
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1')
  t = t.replace(/__([^_]+)__/g, '$1')
  t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1$2')
  t = t.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1$2')
  // Tachado ~~texto~~ -> texto
  t = t.replace(/~~([^~]+)~~/g, '$1')
  // Títulos: "## Título" -> "Título" (el texto ya estructura por sí mismo)
  t = t.replace(/^#{1,6}\s*(.+)$/gm, '$1')
  // Separadores --- / *** / ___ -> punto y aparte limpio
  t = t.replace(/^\s*([-*_]\s*){3,}$/gm, '')
  // Imágenes ![alt](url) -> (imagen omitida: url)
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '($2)')
  // Enlaces [texto](url) -> texto (url)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
  // Citas "> texto" -> texto
  t = t.replace(/^>\s*(.*)$/gm, '$1')
  // Tablas: | a | b | -> "a — b" por fila, ignorando separadores
  t = t.replace(/^\s*\|?[-: ]+\|[-:| ]+\|?\s*$/gm, '')
  t = t.replace(/^\s*\|(.+)\|\s*$/gm, (_m, row) => '\n' + row.split('|').map((c) => c.trim()).filter(Boolean).join(' — '))
  // Barras residuales en prosa (tablas malformadas del modelo): se limpian.
  t = t.replace(/\s*\|\s*/g, ' — ')
  // Listas: "- item" / "* item" / "1. item" -> guión simple o número limpio
  t = t.replace(/^\s*[-*•]\s+/gm, '• ')
  t = t.replace(/^\s*(\d+)[.)]\s+/gm, '$1. ')
  // Código en línea `x` -> x
  t = t.replace(/`([^`]+)`/g, '$1')
  // Colapsar saltos de línea triples o más
  t = t.replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

export async function callPollinations(messages, { json = false } = {}) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0.7,
  }
  if (MAX_TOKENS) body.max_tokens = MAX_TOKENS
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

// Igual que callPollinations pero transmite la respuesta en vivo (SSE del
// proveedor -> callback por fragmento). Devuelve el texto completo.
export async function streamPollinations(messages, { onChunk } = {}) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0.7,
    stream: true,
  }
  if (MAX_TOKENS) body.max_tokens = MAX_TOKENS

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
    if (!res.body) throw new Error('El proveedor no devolvió stream')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload)
          const delta = json?.choices?.[0]?.delta
          const piece = typeof delta?.content === 'string' ? delta.content : ''
          if (piece) {
            full += piece
            onChunk?.(piece)
          }
        } catch {
          // fragmento SSE incompleto: se ignora y se reintenta con el siguiente
        }
      }
    }
    if (!full.trim()) throw new Error('Respuesta vacía de Pollinations')
    return full
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('El motor de IA tardó demasiado en responder.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

// callPollinations con continuación automática: si el proveedor corta la
// respuesta (límite del gateway gratuito), se pide continuar y se une todo.
export async function callPollinationsComplete(messages, { json = false } = {}) {
  if (json) return callPollinations(messages, { json })
  let full = await callPollinations(messages)
  let calls = 1
  while (looksTruncated(full) && calls < CONTINUATION_MAX_CALLS) {
    const more = await callPollinations(buildContinuationMessages(messages, full))
    if (!more.trim()) break
    full = joinText(full, more)
    calls++
  }
  return markdownToPlain(full)
}

// streamPollinations con continuación automática: el estudiante ve la
// escritura en vivo y, si el proveedor corta, la respuesta sigue fluyendo
// sin que note la costura.
export async function streamPollinationsComplete(messages, { onChunk } = {}) {
  let full = await streamPollinations(messages, { onChunk })
  let calls = 1
  while (looksTruncated(full) && calls < CONTINUATION_MAX_CALLS) {
    const more = await streamPollinations(buildContinuationMessages(messages, full), { onChunk })
    if (!more.trim()) break
    full = joinText(full, more)
    calls++
  }
  return full
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
- ESCRITURA NATURAL Y FLUIDA: escribe en prosa limpia y continua, como un profesor hablando a su estudiante. NO uses símbolos de formato: nada de **asteriscos**, ## numerales, ### barras de título, --- separadores, ni tablas con barras |. El texto se muestra tal cual al estudiante: los símbolos se verían como basura visual. Puedes usar párrafos, guiones simples para listas si de verdad ayudan, y emojis con moderación.
- Estructura la profundidad con PALABRAS, no con símbolos: usa frases como "En primer lugar...", "Veamos esto paso a paso", "Un punto importante es...", "Para terminar...", "Un error común es...". La claridad sale del lenguaje, no del formato.
- Sé pedagógico: explica paso a paso, verifica la comprensión, pregunta si algo no quedó claro.
- PROFUNDIDAD OBLIGATORIA: nunca des una explicación superficial. Desarrolla el tema completo: contexto y definiciones precisas, fundamentos teóricos, ejemplos resueltos paso a paso, errores o confusiones comunes, y una síntesis final. Si el tema lo amerita, estructura la respuesta con secciones.
- RESPUESTAS EXTENSAS: no cortes la respuesta por brevedad ni la resumas en exceso. Una buena explicación de tema completo lleva varios párrafos desarrollados. Extiende la respuesta tanto como sea pedagógicamente útil: el objetivo es que el estudiante quede con comprensión real, no con un resumen apresurado.
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
  // Historial ampliado: 40 mensajes para no perder contexto en clases largas.
  const fullMessages = [{ role: 'system', content: system }, ...messages.slice(-40)]

  const content = await callPollinationsComplete(fullMessages)
  return { content, search: searchInfo }
}
