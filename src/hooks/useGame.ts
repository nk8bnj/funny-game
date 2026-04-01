import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Hitbox / layout size for the character sprite (portrait) */
export const PLAYER_WIDTH = 66
export const PLAYER_HEIGHT = 96
export const STAR_SIZE = 36
export const HEART_SIZE = 42
export const MOVE_STEP = 10
export const STAR_TOTAL = 5
export const HEART_DURATION_MS = 5000

export type GamePhase = 'collecting' | 'heart' | 'won' | 'lost'

export type StarItem = { id: string; x: number; y: number }

const TOAST_MESSAGES = [
  'Класс 😄',
  'Почти...',
  'Дальше!',
  'Сияешь ✨',
]

const TOAST_SECOND_STAR = 'Отлично'
const TOAST_FOURTH_STAR = 'Ещё чуть-чуть.'

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function overlapsPlayer(
  hx: number,
  hy: number,
  px: number,
  py: number
): boolean {
  return rectsOverlap(
    hx,
    hy,
    STAR_SIZE,
    STAR_SIZE,
    px,
    py,
    PLAYER_WIDTH,
    PLAYER_HEIGHT
  )
}

function overlapsHeartPlayer(
  hx: number,
  hy: number,
  px: number,
  py: number
): boolean {
  return rectsOverlap(
    hx,
    hy,
    HEART_SIZE,
    HEART_SIZE,
    px,
    py,
    PLAYER_WIDTH,
    PLAYER_HEIGHT
  )
}

function generateStars(
  w: number,
  h: number,
  playerX: number,
  playerY: number
): StarItem[] {
  const stars: StarItem[] = []
  const maxAttempts = 400
  for (let i = 0; i < STAR_TOTAL; i++) {
    let placed = false
    for (let a = 0; a < maxAttempts && !placed; a++) {
      const x = Math.random() * Math.max(0, w - STAR_SIZE)
      const y = Math.random() * Math.max(0, h - STAR_SIZE)
      if (!overlapsPlayer(x, y, playerX, playerY)) {
        stars.push({ id: `star-${i}-${Math.random().toString(36).slice(2)}`, x, y })
        placed = true
      }
    }
    if (!placed) {
      stars.push({
        id: `star-${i}-${Math.random().toString(36).slice(2)}`,
        x: Math.min(w - STAR_SIZE, playerX + PLAYER_WIDTH + 4 + (i % 5) * 8),
        y: Math.min(h - STAR_SIZE, playerY + PLAYER_HEIGHT + 4 + (i % 3) * 8),
      })
    }
  }
  return stars
}

function generateHeartPosition(
  w: number,
  h: number,
  playerX: number,
  playerY: number
): { x: number; y: number } {
  const maxAttempts = 400
  for (let a = 0; a < maxAttempts; a++) {
    const x = Math.random() * Math.max(0, w - HEART_SIZE)
    const y = Math.random() * Math.max(0, h - HEART_SIZE)
    if (!overlapsHeartPlayer(x, y, playerX, playerY)) {
      return { x, y }
    }
  }
  return {
    x: Math.min(w - HEART_SIZE, playerX + PLAYER_WIDTH + 4),
    y: Math.min(h - HEART_SIZE, playerY + PLAYER_HEIGHT + 4),
  }
}

function clampPlayer(
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(w - PLAYER_WIDTH, x)),
    y: Math.max(0, Math.min(h - PLAYER_HEIGHT, y)),
  }
}

export function useGame() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [player, setPlayer] = useState({ x: 0, y: 0 })
  const [stars, setStars] = useState<StarItem[]>([])
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<GamePhase>('collecting')
  const [heart, setHeart] = useState<{ x: number; y: number } | null>(null)
  const [heartDeadline, setHeartDeadline] = useState<number | null>(null)
  const [heartSecondsLeft, setHeartSecondsLeft] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spawned = useRef(false)
  const toastIndex = useRef(0)
  const phaseRef = useRef<GamePhase>('collecting')
  const heartRef = useRef<{ x: number; y: number } | null>(null)
  /** Mirrors `stars` but updates synchronously so rapid moves cannot re-collect before commit. */
  const starsRef = useRef<StarItem[]>([])

  const syncPhase = useCallback((p: GamePhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  useLayoutEffect(() => {
    const el = fieldRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w <= 0 || h <= 0) return
      setSize({ w, h })
      if (!spawned.current) {
        spawned.current = true
        const p = clampPlayer(8, 8, w, h)
        setPlayer(p)
        const initialStars = generateStars(w, h, p.x, p.y)
        starsRef.current = initialStars
        setStars(initialStars)
      } else {
        setPlayer((p) => clampPlayer(p.x, p.y, w, h))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    heartRef.current = heart
  }, [heart])

  useEffect(() => {
    starsRef.current = stars
  }, [stars])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'heart' || !heartDeadline) {
      setHeartSecondsLeft(0)
      return
    }
    const tick = () => {
      setHeartSecondsLeft(
        Math.max(0, Math.ceil((heartDeadline - Date.now()) / 1000))
      )
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [phase, heartDeadline])

  useEffect(() => {
    if (phase !== 'heart') return
    const id = setTimeout(() => {
      if (phaseRef.current === 'heart') syncPhase('lost')
    }, HEART_DURATION_MS)
    return () => clearTimeout(id)
  }, [phase, syncPhase])

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => {
      setToast(null)
      toastTimer.current = null
    }, 1600)
  }, [])

  const resetGame = useCallback(() => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
      toastTimer.current = null
    }
    setToast(null)
    toastIndex.current = 0
    setScore(0)
    setHeart(null)
    heartRef.current = null
    setHeartDeadline(null)
    syncPhase('collecting')
    setSize((s) => {
      if (!s) return s
      const p = clampPlayer(8, 8, s.w, s.h)
      setPlayer(p)
      const nextStars = generateStars(s.w, s.h, p.x, p.y)
      starsRef.current = nextStars
      setStars(nextStars)
      return s
    })
  }, [syncPhase])

  const tryMove = useCallback(
    (dx: number, dy: number) => {
      if (phaseRef.current === 'won' || phaseRef.current === 'lost' || !size)
        return
      setPlayer((p) => {
        const next = clampPlayer(
          p.x + dx * MOVE_STEP,
          p.y + dy * MOVE_STEP,
          size.w,
          size.h
        )

        if (phaseRef.current === 'heart' && heartRef.current) {
          const h = heartRef.current
          if (
            rectsOverlap(
              next.x,
              next.y,
              PLAYER_WIDTH,
              PLAYER_HEIGHT,
              h.x,
              h.y,
              HEART_SIZE,
              HEART_SIZE
            )
          ) {
            syncPhase('won')
            setHeart(null)
            heartRef.current = null
            setHeartDeadline(null)
          }
          return next
        }

        if (phaseRef.current === 'collecting') {
          const prevStars = starsRef.current
          const remaining = prevStars.filter(
            (s) =>
              !rectsOverlap(
                next.x,
                next.y,
                PLAYER_WIDTH,
                PLAYER_HEIGHT,
                s.x,
                s.y,
                STAR_SIZE,
                STAR_SIZE
              )
          )
          const collected = prevStars.length - remaining.length
          if (collected > 0) {
            starsRef.current = remaining
            setStars(remaining)
            setScore((s) => {
              const newScore = s + collected
              if (remaining.length > 0) {
                let msg: string
                if (newScore === 2) {
                  msg = TOAST_SECOND_STAR
                } else if (newScore === 4) {
                  msg = TOAST_FOURTH_STAR
                } else {
                  msg =
                    TOAST_MESSAGES[toastIndex.current % TOAST_MESSAGES.length]
                  toastIndex.current += 1
                }
                showToast(msg)
              }
              return newScore
            })
            if (remaining.length === 0) {
              const hp = generateHeartPosition(
                size.w,
                size.h,
                next.x,
                next.y
              )
              heartRef.current = hp
              setHeart(hp)
              syncPhase('heart')
              setHeartDeadline(Date.now() + HEART_DURATION_MS)
            }
          }
        }
        return next
      })
    },
    [size, showToast, syncPhase]
  )

  return {
    fieldRef,
    size,
    player,
    stars,
    score,
    phase,
    heart,
    heartSecondsLeft,
    toast,
    tryMove,
    resetGame,
  }
}
