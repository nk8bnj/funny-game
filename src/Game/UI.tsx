import type { GamePhase } from '../hooks/useGame'
import { STAR_TOTAL } from '../hooks/useGame'

type Props = {
  phase: GamePhase
  score: number
  heartSecondsLeft: number
  toast: string | null
}

export function UI({ phase, score, heartSecondsLeft, toast }: Props) {
  const hint =
    phase === 'collecting'
      ? 'Собери все звёзды 😄'
      : phase === 'heart'
        ? 'Успей до сердца ❤️'
        : null

  const scoreLine =
    phase === 'collecting' ? (
      <p
        className="game-ui__score"
        aria-label={`Звёзды: ${score} из ${STAR_TOTAL}`}
      >
        <span className="game-ui__score-star" aria-hidden>
          ⭐
        </span>
        <span className="game-ui__score-count">
          {score}/{STAR_TOTAL}
        </span>
      </p>
    ) : phase === 'heart' ? (
      <p className="game-ui__score game-ui__score--heart">
        осталось {heartSecondsLeft} с
      </p>
    ) : null

  return (
    <div className="game-ui">
      {hint ? <p className="game-ui__hint">{hint}</p> : null}
      {scoreLine}
      {toast ? (
        <div className="game-ui__toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
