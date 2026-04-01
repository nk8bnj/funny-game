import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../hooks/useGame'

const POSES = ['/pose-1.png', '/pose-2.png', '/pose-3.png'] as const

/** Native pixel dimensions — must match exported PNGs (see public/pose-*.png) */
const FRAME_INTRINSIC = [
  { w: 265, h: 265 },
  { w: 163, h: 277 },
  { w: 168, h: 274 },
] as const

const MAX_W = Math.max(...FRAME_INTRINSIC.map((f) => f.w))
const MAX_H = Math.max(...FRAME_INTRINSIC.map((f) => f.h))
/** One scale for all frames so source pixels map to the same on-screen size */
const UNIFORM_SCALE = Math.min(PLAYER_WIDTH / MAX_W, PLAYER_HEIGHT / MAX_H)

type Props = {
  x: number
  y: number
  hidden?: boolean
  /** 0–2 walk cycle frame; 0 = idle / pose-1 */
  poseIndex: number
  facingLeft: boolean
}

export function Player({ x, y, hidden, poseIndex, facingLeft }: Props) {
  const frame = ((poseIndex % 3) + 3) % 3
  const src = POSES[frame]
  const { w: iw, h: ih } = FRAME_INTRINSIC[frame]
  const dispW = iw * UNIFORM_SCALE
  const dispH = ih * UNIFORM_SCALE

  return (
    <div
      className="game-player"
      style={{
        left: x,
        top: y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        opacity: hidden ? 0 : 1,
        visibility: hidden ? 'hidden' : 'visible',
        transform: facingLeft ? 'scaleX(-1)' : undefined,
      }}
      aria-hidden={hidden}
    >
      <img
        className="game-player__sprite"
        src={src}
        alt=""
        width={iw}
        height={ih}
        style={{
          width: dispW,
          height: dispH,
        }}
        draggable={false}
      />
    </div>
  )
}
