import './env.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.PROFESOR_IA_DATA_DIR
  ? path.resolve(process.env.PROFESOR_IA_DATA_DIR)
  : path.join(__dirname, '..', 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

let db = { users: [], sessions: [], conversations: [] }

export function initStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
      db = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      }
    } catch {
      db = { users: [], sessions: [], conversations: [] }
    }
  }
}

export function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export function getDb() {
  return db
}
