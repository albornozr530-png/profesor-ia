import './env.js'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { initStore, getDb, save } from './store.js'
import { hashPassword, verifyPassword, newToken, normalizeIdentifier } from './auth.js'
import { LEVELS, MODES } from './levels.js'
import { chat, generateImage } from './ai.js'
import tutorRouter from './tutor.js'
import { transcribeAudio, transcriptionConfigured } from './speech.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || '127.0.0.1'
const app = express()

app.disable('x-powered-by')

const configuredOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://10.0.2.2:3001',
  'https://localhost',
  'capacitor://localhost',
]
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins])

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  next()
})

app.use(cors({
  origin(origin, callback) {
    // Las peticiones nativas y las herramientas de salud pueden no enviar Origin.
    if (
      !origin ||
      allowedOrigins.has('*') ||
      allowedOrigins.has(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    ) return callback(null, true)
    return callback(new Error('Origen no permitido por CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// El audio del fallback de dictado se procesa como binario, no como JSON.
app.use(express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '25mb' }))
app.use(express.json({ limit: '2mb' }))

// Límite ligero para impedir que un cliente público abusen del gateway de IA.
const rateBuckets = new Map()
const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX = Number(process.env.RATE_LIMIT_MAX) || 120
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' && req.path === '/health') return next()
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 })
    return next()
  }
  bucket.count += 1
  if (bucket.count > RATE_MAX) {
    res.setHeader('Retry-After', String(Math.ceil((RATE_WINDOW_MS - (now - bucket.startedAt)) / 1000)))
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.' })
  }
  next()
})

// Endpoints para la interfaz fusionada (chat, revisión, exámenes, fichas, flashcards)
app.use('/api', tutorRouter)

initStore()

const SEMESTERS = ['1º Semestre','2º Semestre','3º Semestre','4º Semestre','5º Semestre','6º Semestre','7º Semestre','8º Semestre','9º Semestre','10º Semestre','11º Semestre','12º Semestre']
const LEGACY_SEMESTER = {
  '1er semestre': '1º Semestre', '2do semestre': '2º Semestre', '3do semestre': '3º Semestre',
  '4do semestre': '4º Semestre', '5do semestre': '5º Semestre', '6do semestre': '6º Semestre',
  '7do semestre': '7º Semestre', '8vo semestre': '8º Semestre', '9no semestre': '9º Semestre',
  '10mo semestre': '10º Semestre', '11vo semestre': '11º Semestre', '12vo semestre': '12º Semestre',
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'profesor-ia',
    port: app.locals.serverPort || PORT,
    transcriptionConfigured: transcriptionConfigured(),
    timestamp: new Date().toISOString(),
  })
})

// Fallback de transcripción para navegadores sin Web Speech API. El cliente
// envía el Blob de MediaRecorder como audio/* y nunca expone la clave del proveedor.
app.post('/api/speech/transcribe', async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ error: 'No se recibió audio para transcribir.' })
  }
  if (!transcriptionConfigured()) {
    return res.status(503).json({
      error: 'La transcripción de audio no está configurada en el servidor.',
      code: 'TRANSCRIPTION_NOT_CONFIGURED',
    })
  }
  try {
    const result = await transcribeAudio(req.body, {
      mimeType: req.get('content-type') || 'audio/webm',
      language: typeof req.query.language === 'string' ? req.query.language.slice(0, 10) : 'es',
    })
    if (!result.text) return res.status(502).json({ error: 'No se pudo obtener texto del audio.' })
    res.json(result)
  } catch (error) {
    console.error('[speech/transcribe]', error.message)
    res.status(error.code === 'TRANSCRIPTION_PROVIDER_ERROR' ? 502 : 500).json({
      error: 'No se pudo transcribir el audio. Intenta de nuevo.',
      code: error.code || 'TRANSCRIPTION_FAILED',
    })
  }
})

// ---------- Helpers ----------
function publicUser(u) {
  return {
    id: u.id,
    identifier: u.identifier,
    name: u.name,
    profile: u.profile || null,
    createdAt: u.createdAt,
  }
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const db = getDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return res.status(401).json({ error: 'No autenticado' })
  const user = db.users.find((u) => u.id === session.userId)
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })
  req.user = user
  next()
}

// ---------- Rutas de configuración pública ----------
app.get('/api/levels', (req, res) => {
  res.json({
    levels: Object.entries(LEVELS).map(([key, v]) => ({
      key,
      label: v.label,
      detailLabel: v.detailLabel,
      detailOptions: v.detailOptions,
      needsSemester: key === 'universitario' || key === 'posgrado',
    })),
    modes: Object.entries(MODES).map(([key, v]) => ({ key, label: v.label })),
    semesters: SEMESTERS,
  })
})

// ---------- Autenticación ----------
app.post('/api/auth/register', (req, res) => {
  const { identifier, password, name } = req.body
  if (!identifier || !password || password.length < 4) {
    return res.status(400).json({ error: 'Identificador y contraseña (mín. 4 caracteres) son obligatorios' })
  }
  const db = getDb()
  const norm = normalizeIdentifier(identifier)
  if (db.users.some((u) => u.identifier === norm)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo/teléfono' })
  }
  const { salt, hash } = hashPassword(password)
  const user = {
    id: crypto.randomUUID(),
    identifier: norm,
    name: name?.trim() || 'Estudiante',
    salt,
    hash,
    profile: null,
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  const token = newToken()
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() })
  save()
  res.json({ token, user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body
  const db = getDb()
  const norm = normalizeIdentifier(identifier)
  const user = db.users.find((u) => u.identifier === norm)
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }
  const token = newToken()
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() })
  save()
  res.json({ token, user: publicUser(user) })
})

app.post('/api/auth/logout', auth, (req, res) => {
  const db = getDb()
  const token = req.headers.authorization.replace('Bearer ', '')
  db.sessions = db.sessions.filter((s) => s.token !== token)
  save()
  res.json({ ok: true })
})

// ---------- Perfil académico ----------


app.post('/api/profile', auth, (req, res) => {
  const { age, level, detail, semester } = req.body
  if (!age || !Number.isInteger(Number(age)) || Number(age) < 5 || Number(age) > 100) {
    return res.status(400).json({ error: 'Edad inválida (entre 5 y 100)' })
  }
  if (!level || !LEVELS[level]) {
    return res.status(400).json({ error: 'Nivel académico inválido' })
  }
  const needsSemester = level === 'universitario' || level === 'posgrado'
  const normalizedSemester = typeof semester === 'string'
    ? (SEMESTERS.includes(semester) ? semester : LEGACY_SEMESTER[semester.toLowerCase()])
    : undefined
  if (needsSemester && !normalizedSemester) {
    return res.status(400).json({ error: 'Selecciona el semestre en curso' })
  }
  req.user.profile = {
    age: Number(age),
    level,
    levelLabel: LEVELS[level].label,
    detail: detail || null,
    semester: needsSemester ? normalizedSemester : null,
    updatedAt: new Date().toISOString(),
  }
  save()
  res.json({ user: publicUser(req.user) })
})

app.get('/api/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// ---------- Conversaciones ----------
app.get('/api/conversations', auth, (req, res) => {
  const db = getDb()
  const convs = db.conversations.filter((c) => c.userId === req.user.id)
  res.json({ conversations: convs.map((c) => ({ id: c.id, title: c.title, mode: c.mode, updatedAt: c.updatedAt })) })
})

app.get('/api/conversations/:id', auth, (req, res) => {
  const db = getDb()
  const conv = db.conversations.find((c) => c.id === req.params.id && c.userId === req.user.id)
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })
  res.json({ conversation: conv })
})

app.delete('/api/conversations/:id', auth, (req, res) => {
  const db = getDb()
  const before = db.conversations.length
  db.conversations = db.conversations.filter((c) => !(c.id === req.params.id && c.userId === req.user.id))
  save()
  res.json({ ok: true, deleted: before !== db.conversations.length })
})

// ---------- Chat con el Profesor IA ----------
app.post('/api/chat', auth, async (req, res) => {
  const { conversationId, message, mode = 'consulta', useWeb = false } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'Mensaje vacío' })
  if (!MODES[mode]) return res.status(400).json({ error: 'Modo inválido' })

  const db = getDb()
  let conv = conversationId
    ? db.conversations.find((c) => c.id === conversationId && c.userId === req.user.id)
    : null
  if (!conv) {
    conv = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      title: message.slice(0, 50),
      mode,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.conversations.push(conv)
  }

  conv.messages.push({ role: 'user', content: message, at: new Date().toISOString() })

  try {
    const { content, search } = await chat({
      profile: req.user.profile,
      mode: MODES[mode],
      messages: conv.messages.map((m) => ({ role: m.role, content: m.content })),
      useWeb,
    })
    conv.messages.push({ role: 'assistant', content, at: new Date().toISOString(), search })
    conv.updatedAt = new Date().toISOString()
    save()
    res.json({ conversationId: conv.id, reply: content, search })
  } catch (err) {
    console.error('[chat] error:', err.message)
    conv.messages.push({ role: 'assistant', content: '⚠️ Hubo un problema conectando con la IA. Intenta de nuevo en unos segundos.', at: new Date().toISOString(), error: true })
    conv.updatedAt = new Date().toISOString()
    save()
    res.status(502).json({ error: 'Error del motor de IA', conversationId: conv.id })
  }
})

// ---------- Progreso del estudiante ----------
app.get('/api/progress', auth, (req, res) => {
  const db = getDb()
  const convs = db.conversations.filter((c) => c.userId === req.user.id)
  const stats = {
    totalMessages: 0,
    byMode: { consulta: 0, revisar: 0, examen: 0 },
    byDay: {}, // 'YYYY-MM-DD' -> mensajes
    conversations: convs.length,
    streak: 0,
  }
  for (const c of convs) {
    for (const m of c.messages) {
      if (m.role !== 'user') continue
      stats.totalMessages++
      stats.byMode[c.mode] = (stats.byMode[c.mode] || 0) + 1
      const day = (m.at || '').slice(0, 10)
      if (day) stats.byDay[day] = (stats.byDay[day] || 0) + 1
    }
  }
  // Racha de días consecutivos (hasta hoy)
  const today = new Date()
  const fmt = (d) => d.toISOString().slice(0, 10)
  let streak = 0
  const cur = new Date(today)
  // Si hoy no hay actividad, la racha cuenta desde ayer (racha viva, no rota)
  if (!stats.byDay[fmt(cur)]) cur.setDate(cur.getDate() - 1)
  while (stats.byDay[fmt(cur)]) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  stats.streak = streak

  // Serie de últimos 14 días
  const days14 = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = fmt(d)
    days14.push({ date: key, count: stats.byDay[key] || 0 })
  }
  stats.days14 = days14

  res.json({ progress: { totalMessages: stats.totalMessages, byMode: stats.byMode, conversations: stats.conversations, streak: stats.streak, days14: days14 } })
})

// ---------- Imagen didáctica ----------
app.post('/api/image', auth, async (req, res) => {
  const { prompt } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt vacío' })
  try {
    const url = await generateImage(`educational illustration, didactic diagram, clean, colorful: ${prompt}`)
    res.json({ url })
  } catch (error) {
    console.error('[image]', error.message)
    res.status(502).json({ error: 'No se pudo generar la imagen didáctica.' })
  }
})

// En producción el mismo proceso puede servir el cliente compilado y la API.
// Así no dependemos de file:// (Electron) ni de un proxy externo (Capacitor).
const staticDir = process.env.PROFESOR_IA_STATIC_DIR
  ? path.resolve(process.env.PROFESOR_IA_STATIC_DIR)
  : path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(staticDir, 'index.html'))
  })
} else {
  app.get('/', (req, res) => {
    res.json({ service: 'Profesor IA API', message: 'Ejecuta `npm run build:web` para habilitar el cliente web.' })
  })
}

let serverInstance = null

export function startServer({ port = PORT, host = HOST } = {}) {
  return new Promise((resolve, reject) => {
    if (serverInstance) return resolve(serverInstance)
    const server = app.listen(port, host, () => {
      serverInstance = server
      app.locals.serverPort = server.address()?.port || port
      console.log(`✅ Profesor IA backend escuchando en http://${host}:${app.locals.serverPort}`)
      resolve(server)
    })
    server.once('error', reject)
  })
}

export function stopServer() {
  return new Promise((resolve) => {
    if (!serverInstance) return resolve()
    serverInstance.close(() => {
      serverInstance = null
      resolve()
    })
  })
}

export { app }

const invokedFile = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (invokedFile === import.meta.url) {
  startServer().catch((error) => {
    console.error('No se pudo iniciar el servidor:', error)
    process.exitCode = 1
  })
}
