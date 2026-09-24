import crypto from 'crypto'

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, hash) {
  try {
    const candidate = crypto.scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

export function newToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Identificador puede ser email o teléfono; se normaliza para evitar duplicados
export function normalizeIdentifier(identifier) {
  const trimmed = (identifier || '').trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  // Teléfono: quitar espacios, guiones, paréntesis y signo +
  const digits = trimmed.replace(/[\s\-()+.]/g, '')
  return digits
}
