import { HEART_SIZE } from '../hooks/useGame'

type Props = {
  x: number
  y: number
  hidden?: boolean
}

export function Heart({ x, y, hidden }: Props) {
  return (
    <div
      className="game-heart"
      style={{
        left: x,
        top: y,
        width: HEART_SIZE,
        height: HEART_SIZE,
        opacity: hidden ? 0 : 1,
        visibility: hidden ? 'hidden' : 'visible',
      }}
      aria-hidden={hidden}
    >
      ❤️
    </div>
  )
}
