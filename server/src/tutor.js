// Endpoints /api/tutor/* que consume la interfaz fusionada (sin API keys: Pollinations)
import express from 'express'
import { LEVELS } from './levels.js'
import { webSearch } from './search.js'
import { callPollinationsComplete, streamPollinationsComplete, markdownToPlain } from './ai.js'

const router = express.Router()

// Mapea el perfil del frontend (StudentProfile) a una descripción para el system prompt
function profileToText(profile = {}) {
  const levelMap = { universidad: 'universitario' }
  const levelKey = levelMap[profile.level] || profile.level
  const levelCfg = LEVELS[levelKey]
  const parts = []
  if (profile.name) parts.push(`Estudiante: ${profile.name}`)
  if (profile.age) parts.push(`${profile.age} años`)
  if (levelCfg) parts.push(`Nivel: ${levelCfg.label}`)
  if (profile.career) parts.push(`Carrera: ${profile.career}`)
  if (profile.semester) parts.push(`Semestre en curso: ${profile.semester} (enfócate en lo que se ve en este punto)`)
  if (profile.subject) parts.push(`Materia/área actual: ${profile.subject}`)
  if (profile.objective) parts.push(`Objetivo de aprendizaje: ${profile.objective}`)
  return { text: parts.join('. '), levelKey, levelCfg }
}

function baseSystem(profile, extra = '') {
  const { text, levelCfg } = profileToText(profile)
  const today = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date())
  return `Eres "Profesor IA", un profesor experto, paciente y dedicado. ${text}.
Fecha actual del sistema: ${today}. No afirmes que un evento aún no ocurrido ya sucede; verifica la fecha cuando la pregunta sea dependiente del tiempo.
${levelCfg?.systemPrompt || ''}
- Responde SIEMPRE en español, con el tono y profundidad adecuados al nivel del estudiante.
- ESCRITURA NATURAL Y FLUIDA: escribe en prosa limpia y continua, como un profesor hablando a su estudiante. NO uses símbolos de formato: nada de **asteriscos**, ## numerales, --- separadores ni tablas con barras. El texto se muestra tal cual: los símbolos se verían como basura visual. Estructura con palabras ("En primer lugar...", "Veamos paso a paso...", "Para terminar...") y usa emojis con moderación.
- RESPUESTAS EXTENSAS Y PROFUNDAS: desarrolla cada tema por completo — definiciones, fundamentos, ejemplos resueltos paso a paso, errores comunes y síntesis. Nunca des respuestas superficiales ni cortes por brevedad: extiende hasta que el tema quede verdaderamente comprendido.
- Sé pedagógico: paso a paso, ejemplos, verifica comprensión.
${extra}`
}

// Extrae JSON de forma robusta (a veces el modelo envuelve en ```json o agrega texto)
function extractJson(text) {
  if (!text) throw new Error('Respuesta vacía')
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

async function jsonCall(system, user) {
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const content = await callPollinations(
        [
          { role: 'system', content: `${system}\n\nResponde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código.` },
          { role: 'user', content: user },
        ],
        { json: true }
      )
      return extractJson(content)
    } catch (err) {
      lastErr = err
      console.warn(`[jsonCall] intento ${attempt} falló: ${err.message}`)
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500))
    }
  }
  throw lastErr
}

// ---------- 1) Chat ----------
router.post('/tutor/chat', async (req, res) => {
  try {
    const { messages = [], profile = {}, useSearch = false } = req.body
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')

    let sources = []
    if (useSearch && lastUser) {
      const found = await webSearch(lastUser.content.slice(0, 200))
      if (found) {
        sources = found.results.slice(0, 4).map((r) => ({ title: r.title, uri: r.url, snippet: r.snippet || '' }))
      }
    }
    const searchBlock = sources.length
      ? `\n\nRESULTADOS DE BÚSQUEDA WEB (úsalos si son relevantes, cita la fuente al final):\n${sources.map((s) => `- ${s.title}: ${s.snippet || 'sin resumen'} (${s.uri})`).join('\n')}`
      : ''

    const system = baseSystem(profile, 'Estás en una conversación de tutoría por chat.\nPROFUNDIDAD: desarrolla cada tema por completo — definiciones, fundamentos, ejemplos resueltos paso a paso, errores comunes y síntesis. Nunca des respuestas superficiales ni cortes por brevedad.' + searchBlock)
    const content = await callPollinationsComplete(
      [{ role: 'system', content: system }, ...messages.slice(-40).map((m) => ({ role: m.role, content: m.content }))],
      {}
    )
    res.json({ text: content, sources })
  } catch (err) {
    console.error('[tutor/chat]', err.message)
    res.status(502).json({ error: 'Error del motor de IA. Intenta de nuevo en unos segundos.' })
  }
})

// ---------- 1b) Chat con escritura en vivo (streaming SSE) ----------
// El profesor "escribe" la respuesta en tiempo real: el servidor retransmite
// cada fragmento del proveedor como evento SSE y al final envía las fuentes.
router.post('/tutor/chat/stream', async (req, res) => {
  try {
    const { messages = [], profile = {}, useSearch = false } = req.body
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')

    let sources = []
    if (useSearch && lastUser) {
      const found = await webSearch(lastUser.content.slice(0, 200))
      if (found) {
        sources = found.results.slice(0, 4).map((r) => ({ title: r.title, uri: r.url, snippet: r.snippet || '' }))
      }
    }
    const searchBlock = sources.length
      ? `\n\nRESULTADOS DE BÚSQUEDA WEB (úsalos si son relevantes, cita la fuente al final):\n${sources.map((s) => `- ${s.title}: ${s.snippet || 'sin resumen'} (${s.uri})`).join('\n')}`
      : ''

    const system = baseSystem(profile, 'Estás en una conversación de tutoría por chat.\nPROFUNDIDAD: desarrolla cada tema por completo — definiciones, fundamentos, ejemplos resueltos paso a paso, errores comunes y síntesis. Nunca des respuestas superficiales ni cortes por brevedad.' + searchBlock)
    const fullMessages = [
      { role: 'system', content: system },
      ...messages.slice(-40).map((m) => ({ role: m.role, content: m.content })),
    ]

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    send('sources', { sources })

    let received = false
    try {
      const fullText = await streamPollinationsComplete(fullMessages, {
        onChunk: (piece) => {
          received = true
          send('delta', { text: piece })
        },
      })
      // Texto final limpio: sin asteriscos, numerales ni barras de Markdown.
      send('final', { text: markdownToPlain(fullText) })
      send('done', {})
    } catch (streamErr) {
      console.error('[tutor/chat/stream]', streamErr.message)
      if (!received) {
        // El stream aún no empezó: se puede caer a una respuesta JSON de error.
        send('error', { error: 'Error del motor de IA. Intenta de nuevo en unos segundos.' })
      } else {
        send('error', { error: 'La conexión con el motor de IA se interrumpió a mitad de la respuesta.' })
      }
    }
    res.end()
  } catch (err) {
    // Si los headers aún no se enviaron (p. ej. falló la búsqueda web), error normal.
    if (!res.headersSent) {
      console.error('[tutor/chat/stream]', err.message)
      res.status(502).json({ error: 'Error del motor de IA. Intenta de nuevo en unos segundos.' })
    } else {
      res.end()
    }
  }
})

// ---------- 2) Revisión de ejercicios ----------
router.post('/tutor/review', async (req, res) => {
  try {
    const { exerciseStatement = '', studentWork = '', profile = {} } = req.body
    if (!studentWork.trim()) return res.status(400).json({ error: 'Falta el trabajo del estudiante' })

    const system = baseSystem(
      profile,
      `Estás revisando un ejercicio resuelto por el estudiante. Devuelve JSON con EXACTAMENTE estas claves:
{
  "status": "correct" | "partially_correct" | "needs_work",
  "summary": "resumen breve del veredicto",
  "identifiedMistake": "error principal encontrado o null si no hay",
  "stepByStep": ["paso 1", "paso 2", ...],  // solución correcta paso a paso
  "pedagogicalExplanation": "explicación del por qué del error, con teoría",
  "encouragement": "frase motivadora personalizada",
  "suggestedPractice": "un ejercicio similar para practicar"
}`
    )
    const user = `Enunciado del ejercicio: ${exerciseStatement || '(no proporcionado, deduce del trabajo)'}
Trabajo del estudiante:
${studentWork}`
    const data = await jsonCall(system, user)

    res.json({
      status: ['correct', 'partially_correct', 'needs_work'].includes(data.status) ? data.status : 'needs_work',
      summary: data.summary || '',
      identifiedMistake: data.identifiedMistake ?? null,
      stepByStep: Array.isArray(data.stepByStep) ? data.stepByStep : [],
      pedagogicalExplanation: data.pedagogicalExplanation || '',
      encouragement: data.encouragement || '',
      suggestedPractice: data.suggestedPractice || '',
    })
  } catch (err) {
    console.error('[tutor/review]', err.message)
    res.status(502).json({ error: 'Error del motor de IA al revisar. Intenta de nuevo.' })
  }
})

// ---------- 3) Simulacro de examen ----------
router.post('/tutor/generate-quiz', async (req, res) => {
  try {
    const { topic = '', profile = {}, difficulty = 'medium', count = 4 } = req.body
    if (!topic.trim()) return res.status(400).json({ error: 'Falta el tema del examen' })
    const n = Math.min(Math.max(Number(count) || 4, 1), 10)

    const system = baseSystem(
      profile,
      `Generas exámenes de práctica. Devuelve JSON con EXACTAMENTE estas claves:
{
  "title": "título del examen",
  "description": "breve descripción",
  "questions": [
    { "question": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "por qué es correcta", "tip": "consejo para recordar" }
  ]
}
Dificultad: ${difficulty}. Exactamente ${n} preguntas. "correctIndex" es el índice (0-based) de la opción correcta. Las opciones deben ser plausibles y solo una correcta.`
    )
    const data = await jsonCall(system, `Genera un examen de práctica sobre: ${topic}`)

    const questions = (data.questions || [])
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length >= 2)
      .map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: Math.min(Math.max(Number(q.correctIndex) || 0, 0), q.options.length - 1),
        explanation: q.explanation || '',
        tip: q.tip || '',
      }))
    if (!questions.length) throw new Error('El modelo no devolvió preguntas válidas')

    res.json({ title: data.title || `Examen: ${topic}`, description: data.description || '', questions })
  } catch (err) {
    console.error('[tutor/generate-quiz]', err.message)
    res.status(502).json({ error: 'Error generando el examen. Intenta de nuevo.' })
  }
})

// ---------- 4) Fichas de estudio ----------
router.post('/tutor/summary-notes', async (req, res) => {
  try {
    const { topic = '', profile = {} } = req.body
    if (!topic.trim()) return res.status(400).json({ error: 'Falta el tema' })

    const system = baseSystem(
      profile,
      `Creas fichas de estudio concisas. Devuelve JSON con EXACTAMENTE estas claves:
{
  "title": "título de la ficha",
  "summary": "resumen claro del tema (2-4 párrafos cortos, Markdown permitido)",
  "keyPoints": ["punto clave 1", "..."],
  "practicalExample": "ejemplo práctico del mundo real",
  "memoryTrick": "truco mnemotécnico para recordar",
  "commonMistakeToAvoid": "error común que cometen los estudiantes con este tema"
}`
    )
    const data = await jsonCall(system, `Crea una ficha de estudio sobre: ${topic}`)
    res.json({
      title: data.title || topic,
      summary: data.summary || '',
      keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
      practicalExample: data.practicalExample || '',
      memoryTrick: data.memoryTrick || '',
      commonMistakeToAvoid: data.commonMistakeToAvoid || '',
    })
  } catch (err) {
    console.error('[tutor/summary-notes]', err.message)
    res.status(502).json({ error: 'Error generando la ficha. Intenta de nuevo.' })
  }
})

// ---------- 5) Flashcards interactivas ----------
router.post('/tutor/generate-flashcards', async (req, res) => {
  try {
    const { topic = '', profile = {}, noteContext = '', count = 6 } = req.body
    if (!topic.trim()) return res.status(400).json({ error: 'Falta el tema' })
    const n = Math.min(Math.max(Number(count) || 6, 1), 12)

    const system = baseSystem(
      profile,
      `Creas flashcards (tarjetas de memoria) para estudiar. Devuelve JSON con EXACTAMENTE estas claves:
{
  "title": "título del mazo",
  "cards": [
    { "front": "pregunta o concepto", "back": "respuesta o definición", "hint": "pista opcional", "category": "categoría", "difficulty": "easy" | "medium" | "hard" }
  ]
}
Exactamente ${n} tarjetas. Frentes concisos (una pregunta clara), dorsos completos pero breves.`
    )
    const user = noteContext
      ? `Crea flashcards sobre: ${topic}\n\nContexto de la ficha de estudio del estudiante:\n${noteContext.slice(0, 2000)}`
      : `Crea flashcards sobre: ${topic}`
    const data = await jsonCall(system, user)

    const cards = (data.cards || [])
      .filter((c) => c.front && c.back)
      .map((c) => ({
        front: c.front,
        back: c.back,
        hint: c.hint || undefined,
        category: c.category || undefined,
        difficulty: ['easy', 'medium', 'hard'].includes(c.difficulty) ? c.difficulty : 'medium',
      }))
    if (!cards.length) throw new Error('El modelo no devolvió tarjetas válidas')

    res.json({ title: data.title || `Flashcards: ${topic}`, cards })
  } catch (err) {
    console.error('[tutor/generate-flashcards]', err.message)
    res.status(502).json({ error: 'Error generando las flashcards. Intenta de nuevo.' })
  }
})

export default router
