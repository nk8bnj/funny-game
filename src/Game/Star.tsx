import type { StarItem } from '../hooks/useGame'
import { STAR_SIZE } from '../hooks/useGame'

type Props = {
  star: StarItem
  hidden?: boolean
  /** Smaller glyph + glow when the heart is on the field so stars do not dominate */
  compact?: boolean
}

export function Star({ star, hidden, compact }: Props) {
  return (
    <div
      className={compact ? 'game-star game-star--compact' : 'game-star'}
      style={{
        left: star.x,
        top: star.y,
        width: STAR_SIZE,
        height: STAR_SIZE,
        opacity: hidden ? 0 : 1,
        visibility: hidden ? 'hidden' : 'visible',
      }}
      aria-hidden={hidden}
    >
      ⭐
    </div>
  )
}
