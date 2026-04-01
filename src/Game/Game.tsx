import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../hooks/useGame'
import { Star } from './Star'
import { Heart } from './Heart'
import { Player } from './Player'
import { UI } from './UI'
import './Game.css'

const FINAL_COPY = `🎉 Получилось!

Награда:
☕ Кофе со мной

(да, это был хитрый план 😄)`

const MSG_ACCEPT = `Отлично! Напишу тебе и договоримся 🙂`
const MSG_THINK = `Ладно 😄 Всё равно считаю это победой`

const LOSE_COPY = `Время вышло — сердечко исчезло.

Ещё раз?`

type Dir = 'up' | 'down' | 'left' | 'right'

const DIR_VEC: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

const WALK_POSE_COUNT = 3

export function Game() {
  const {
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
  } = useGame()
  const [reply, setReply] = useState<string | null>(null)
  const [walkFrame, setWalkFrame] = useState(0)
  const [facingLeft, setFacingLeft] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeDir = useRef<Dir | null>(null)
  const keysHeldOrder = useRef<string[]>([])
  const idlePoseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playing = phase === 'collecting' || phase === 'heart'
  const ended = phase === 'won' || phase === 'lost'

  const scheduleIdlePose = useCallback(() => {
    if (idlePoseTimer.current) clearTimeout(idlePoseTimer.current)
    idlePoseTimer.current = setTimeout(() => {
      setWalkFrame(0)
      idlePoseTimer.current = null
    }, 320)
  }, [])

  const doMove = useCallback(
    (dx: number, dy: number) => {
      tryMove(dx, dy)
      if (dx !== 0) setFacingLeft(dx < 0)
      setWalkFrame((f) => (f + 1) % WALK_POSE_COUNT)
      scheduleIdlePose()
    },
    [tryMove, scheduleIdlePose]
  )

  useEffect(() => {
    return () => {
      if (idlePoseTimer.current) clearTimeout(idlePoseTimer.current)
    }
  }, [])

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current)
      holdTimer.current = null
    }
    activeDir.current = null
  }, [])

  const startHold = useCallback(
    (dir: Dir) => {
      if (!playing) return
      clearHold()
      const [dx, dy] = DIR_VEC[dir]
      doMove(dx, dy)
      activeDir.current = dir
      holdTimer.current = setInterval(() => {
        if (activeDir.current) {
          const [ddx, ddy] = DIR_VEC[activeDir.current]
          doMove(ddx, ddy)
        }
      }, 115)
    },
    [playing, doMove, clearHold]
  )

  useEffect(() => {
    return () => clearHold()
  }, [clearHold])

  useEffect(() => {
    if (!playing) {
      clearHold()
      keysHeldOrder.current = []
    }
  }, [playing, clearHold])

  useEffect(() => {
    const norm = (key: string) => (key.length === 1 ? key.toLowerCase() : key)

    const keyToDir = (key: string): Dir | null => {
      switch (norm(key)) {
        case 'ArrowUp':
        case 'w':
          return 'up'
        case 'ArrowDown':
        case 's':
          return 'down'
        case 'ArrowLeft':
        case 'a':
          return 'left'
        case 'ArrowRight':
        case 'd':
          return 'right'
        default:
          return null
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!playing) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))
        return

      const dir = keyToDir(e.key)
      if (!dir) return
      if (e.repeat) return

      e.preventDefault()
      const k = norm(e.key)
      keysHeldOrder.current = keysHeldOrder.current.filter((x) => x !== k)
      keysHeldOrder.current.push(k)
      startHold(dir)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const dir = keyToDir(e.key)
      if (!dir) return

      const k = norm(e.key)
      keysHeldOrder.current = keysHeldOrder.current.filter((x) => x !== k)
      if (keysHeldOrder.current.length === 0) clearHold()
      else {
        const last = keysHeldOrder.current[keysHeldOrder.current.length - 1]
        const d = keyToDir(last)
        if (d) startHold(d)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [playing, startHold, clearHold])

  const handleRetry = useCallback(() => {
    setReply(null)
    resetGame()
  }, [resetGame])

  return (
    <div className="game-root">
      <div className={`game-shell${ended ? ' game-shell--finished' : ''}`}>
        <UI
          phase={phase}
          score={score}
          heartSecondsLeft={heartSecondsLeft}
          toast={toast}
        />

        <div
          className="game-field-wrap"
          style={{ touchAction: 'none', userSelect: 'none' }}
        >
          <div
            ref={fieldRef}
            className="game-field"
            aria-label="Игровое поле"
          >
            {size ? (
              <>
                {stars.map((s) => (
                  <Star
                    key={s.id}
                    star={s}
                    hidden={!playing}
                    compact={phase === 'heart'}
                  />
                ))}
                {phase === 'heart' && heart ? (
                  <Heart x={heart.x} y={heart.y} hidden={!playing} />
                ) : null}
                <Player
                  x={player.x}
                  y={player.y}
                  hidden={!playing}
                  poseIndex={walkFrame}
                  facingLeft={facingLeft}
                />
              </>
            ) : null}
          </div>
        </div>

        <div
          className="game-controls"
          aria-label="Сенсорное управление"
          style={{ touchAction: 'none' }}
        >
          <div className="game-controls__row">
            <DirPadButton
              label="Вверх"
              symbol="↑"
              disabled={!playing}
              onPointerDown={() => startHold('up')}
              onPointerEnd={clearHold}
            />
          </div>
          <div className="game-controls__row game-controls__row--mid">
            <DirPadButton
              label="Влево"
              symbol="←"
              disabled={!playing}
              onPointerDown={() => startHold('left')}
              onPointerEnd={clearHold}
            />
            <DirPadButton
              label="Вниз"
              symbol="↓"
              disabled={!playing}
              onPointerDown={() => startHold('down')}
              onPointerEnd={clearHold}
            />
            <DirPadButton
              label="Вправо"
              symbol="→"
              disabled={!playing}
              onPointerDown={() => startHold('right')}
              onPointerEnd={clearHold}
            />
          </div>
        </div>
      </div>

      {phase === 'won' ? (
        <div className="game-modal-backdrop" role="presentation">
          <div
            className="game-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-modal-title"
          >
            <div id="game-modal-title" className="game-modal__copy">
              {FINAL_COPY.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00a0'}</p>
              ))}
            </div>
            <div className="game-modal__actions">
              <button
                type="button"
                className="game-modal__btn game-modal__btn--primary"
                onClick={() => setReply(MSG_ACCEPT)}
              >
                Забрать награду 😄
              </button>
              <button
                type="button"
                className="game-modal__btn"
                onClick={() => setReply(MSG_THINK)}
              >
                Подумать
              </button>
            </div>
            {reply ? (
              <p className="game-modal__reply" role="status">
                {reply}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'lost' ? (
        <div className="game-modal-backdrop" role="presentation">
          <div
            className="game-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-lose-title"
          >
            <div id="game-lose-title" className="game-modal__copy">
              {LOSE_COPY.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00a0'}</p>
              ))}
            </div>
            <div className="game-modal__actions">
              <button
                type="button"
                className="game-modal__btn game-modal__btn--primary"
                onClick={handleRetry}
              >
                Ещё раз
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DirPadButton({
  label,
  symbol,
  disabled,
  onPointerDown,
  onPointerEnd,
}: {
  label: string
  symbol: string
  disabled: boolean
  onPointerDown: () => void
  onPointerEnd: () => void
}) {
  return (
    <button
      type="button"
      className="game-dir-btn"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault()
        if (disabled) return
        ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
        onPointerDown()
      }}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={(e) => {
        if (e.buttons === 0) onPointerEnd()
      }}
    >
      {symbol}
    </button>
  )
}
