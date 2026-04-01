/**
 * Maps field CSS coordinates to source image pixels (same math as background-size: cover + center).
 */
export type TerrainData = {
  width: number
  height: number
  data: Uint8ClampedArray
}

export async function loadTerrainImage(url: string): Promise<TerrainData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      if (!ctx) {
        reject(new Error('2d context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      resolve({
        width: img.width,
        height: img.height,
        data: imageData.data,
      })
    }
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    img.src = url
  })
}

export function fieldToImage(
  fx: number,
  fy: number,
  fieldW: number,
  fieldH: number,
  imgW: number,
  imgH: number
): { ix: number; iy: number } {
  const s = Math.max(fieldW / imgW, fieldH / imgH)
  const visW = fieldW / s
  const visH = fieldH / s
  const srcX0 = (imgW - visW) / 2
  const srcY0 = (imgH - visH) / 2
  const ix = srcX0 + (fx / fieldW) * visW
  const iy = srcY0 + (fy / fieldH) * visH
  return { ix, iy }
}

function sampleWalkable(td: TerrainData, ix: number, iy: number): boolean {
  const x = Math.floor(ix)
  const y = Math.floor(iy)
  if (x < 0 || y < 0 || x >= td.width || y >= td.height) return false
  const i = (y * td.width + x) * 4
  const r = td.data[i]
  const g = td.data[i + 1]
  const b = td.data[i + 2]
  const a = td.data[i + 3]
  return pixelIsWalkable(r, g, b, a)
}

/**
 * Void: dark purple/black. Water: blue pond. Walkable: grass tops, bridges, light terrain.
 */
function pixelIsWalkable(r: number, g: number, b: number, a: number): boolean {
  if (a < 128) return false
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  const m = Math.max(r, g, b)
  if (lum < 34 || m < 32) return false
  // Pond / water
  if (b > r + 14 && b > g + 5 && lum > 40 && lum < 210) return false
  // Grass
  if (g >= r + 4 && g >= b + 2) return true
  // Wood bridges / brown paths
  if (r > 52 && g > 38 && b < r - 4 && r < 215) return true
  // Mixed topsoil / highlights
  if (lum > 52 && lum < 205 && g > 42 && g > b - 4) return true
  return false
}

/** Sample several points along the bottom of the hitbox (feet + width) for bridges */
export function rectWalkable(
  td: TerrainData,
  left: number,
  top: number,
  rw: number,
  rh: number,
  fieldW: number,
  fieldH: number
): boolean {
  const padX = Math.max(4, rw * 0.12)
  const footY = top + rh - 2
  const midY = top + rh * 0.55
  const xs = [left + padX, left + rw * 0.5, left + rw - padX]
  const ys = [footY, footY - 1, midY]
  for (const fy of ys) {
    for (const fx of xs) {
      const { ix, iy } = fieldToImage(fx, fy, fieldW, fieldH, td.width, td.height)
      if (!sampleWalkable(td, ix, iy)) return false
    }
  }
  return true
}

export function playerFitsAt(
  td: TerrainData,
  px: number,
  py: number,
  pw: number,
  ph: number,
  fieldW: number,
  fieldH: number
): boolean {
  return rectWalkable(td, px, py, pw, ph, fieldW, fieldH)
}

export function heartFitsAt(
  td: TerrainData,
  x: number,
  y: number,
  size: number,
  fieldW: number,
  fieldH: number
): boolean {
  const pad = size * 0.2
  const pts: [number, number][] = [
    [x + size * 0.5, y + size * 0.5],
    [x + pad, y + pad],
    [x + size - pad, y + pad],
    [x + pad, y + size - pad],
    [x + size - pad, y + size - pad],
  ]
  for (const [fx, fy] of pts) {
    const { ix, iy } = fieldToImage(fx, fy, fieldW, fieldH, td.width, td.height)
    if (!sampleWalkable(td, ix, iy)) return false
  }
  return true
}

/** Random then grid search for a valid spawn inside the field. */
export function findPlayerSpawn(
  fieldW: number,
  fieldH: number,
  td: TerrainData,
  pw: number,
  ph: number
): { x: number; y: number } {
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * Math.max(0, fieldW - pw)
    const y = Math.random() * Math.max(0, fieldH - ph)
    if (playerFitsAt(td, x, y, pw, ph, fieldW, fieldH)) return { x, y }
  }
  for (let y = 0; y <= fieldH - ph; y += 4) {
    for (let x = 0; x <= fieldW - pw; x += 4) {
      if (playerFitsAt(td, x, y, pw, ph, fieldW, fieldH)) return { x, y }
    }
  }
  return { x: 0, y: 0 }
}
