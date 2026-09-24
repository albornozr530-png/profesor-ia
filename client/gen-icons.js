// Genera icon-192.png e icon-512.png sin dependencias (PNG manual por chunks)
import fs from 'fs'

function crc32(buf) {
  let table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function makeIcon(size) {
  const px = (x) => Math.round(x * size) / size
  const rows = []
  const W = size
  // Birrete centrado
  const cx = 0.5, cy = 0.46
  const boardTop = 0.32, boardBottom = 0.52, boardHalf = 0.30
  const headR = 0.13
  const tasselX = 0.80, tasselY = 0.62
  for (let y = 0; y < W; y++) {
    const row = Buffer.alloc(W * 4 + 1)
    row[0] = 0 // filtro: ninguno
    for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / W
      // Fondo: gradiente radial cian→azul oscuro
      const d = Math.hypot(nx - 0.5, ny - 0.5) * 2
      const bg = [
        Math.max(0, 4 + (0 - 4) * d) + 0,
        Math.round(Math.max(10, 229 * (1 - d * 0.7))),
        Math.round(Math.max(20, 255 * (1 - d * 0.6))),
      ]
      let r = 4, g = Math.round(10 + 30 * (1 - d)), b = Math.round(20 + 60 * (1 - d))
      // Tablero del birrete (rombo): entre dos líneas diagonales
      const inBoard =
        ny > boardTop && ny < boardBottom &&
        Math.abs(nx - cx) < boardHalf * (1 - (ny - boardTop) / (boardBottom - boardTop) * 0.55)
      // Cabeza (círculo) bajo el tablero
      const inHead = Math.hypot(nx - cx, ny - (cy + 0.02)) < headR && ny > 0.44
      // Borde del tablero (línea gruesa en la parte inferior)
      const inEdge = ny >= boardBottom && ny < boardBottom + 0.05 && Math.abs(nx - cx) < boardHalf * 0.45
      // Borla: línea del centro-derecha hacia abajo
      const inTasselLine = Math.abs(nx - cx) < 0.012 && ny > boardBottom && ny < tasselY
      const inTassel = Math.hypot(nx - cx, ny - tasselY) < 0.035
      if (inBoard || inEdge || inTasselLine || inTassel) { r = 0; g = 229; b = 255 }
      else if (inHead) { r = 124; g = 77; b = 255 }
      const o = 1 + x * 4
      row[o] = r; row[o + 1] = g; row[o + 2] = b; row[o + 3] = 255
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4)
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibDeflate(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function zlibDeflate(data) {
  // Deflate crudo con bloques stored (sin compresión) — válido y simple
  const chunks = []
  const maxBlock = 65535
  let i = 0
  while (i < data.length) {
    const end = Math.min(i + maxBlock, data.length)
    const isFinal = end === data.length
    const block = Buffer.alloc((end - i) + 5)
    block[0] = isFinal ? 1 : 0
    block.writeUInt16LE(end - i, 1)
    block.writeUInt16LE(0xffff ^ (end - i), 3)
    data.copy(block, 5, i, end)
    chunks.push(block)
    i = end
  }
  // zlib header + adler32
  const adler = adler32(data)
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(adler)
  return Buffer.concat([Buffer.from([0x78, 0x01]), ...chunks, tail])
}

function adler32(buf) {
  let a = 1, b = 0
  for (const byte of buf) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

fs.writeFileSync('public/icon-512.png', makeIcon(512))
fs.writeFileSync('public/icon-192.png', makeIcon(192))
console.log('✅ Iconos generados: public/icon-512.png, public/icon-192.png')
