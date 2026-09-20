import { useGame } from '../game/GameContext'
import { cardById } from '../data/series1Cards'
import type { PlayerId } from '../game/engine/types'

export function PlayerPanel({ playerId, opponent = false }: { playerId: PlayerId; opponent?: boolean }) {
  const { state, definitions } = useGame()
  const player = state.players[playerId]
  const active = player.activeHoodmon
  const activeDef = active ? definitions[active.definitionId] : undefined
  const activeArt = active ? cardById[active.definitionId] : undefined

  return (
    <section className={`player-panel ${opponent ? 'opponent' : ''}`}>
      <div className="player-header">
        <div><span className="eyebrow">{playerId === 'P1' ? 'PLAYER 1' : 'PLAYER 2'}</span><strong>{state.currentPlayerTurn === playerId ? 'ACTIVE TURN' : 'WAITING'}</strong></div>
        <div className="stat-row">
          <span>LP <b>{player.lp}</b></span>
          <span>BOND <b>{player.bond}/10</b></span>
          <span>STARS <b>{player.objectiveStars}/3</b></span>
        </div>
      </div>

      <div className="zone-row">
        <Zone title="FIELD" filled={Boolean(player.field)} />
        <Zone title="MAGIC 1" filled={Boolean(player.magic[0])} />
        <Zone title="MAGIC 2" filled={Boolean(player.magic[1])} />
        <Zone title="MAGIC 3" filled={Boolean(player.magic[2])} />
        <Zone title="TRAP 1" filled={Boolean(player.traps[0])} />
        <Zone title="TRAP 2" filled={Boolean(player.traps[1])} />
      </div>

      <div className="hoodmon-row">
        <div className={`active-card ${active?.readyState === 'exhausted' ? 'exhausted' : ''}`}>
          {activeArt && <img className="battle-card-art" src={activeArt.image} alt="" />}
          <div className="battle-card-copy">
            <span className="eyebrow">ACTIVE HOODMON</span>
            <strong>{activeDef?.name ?? 'EMPTY'}</strong>
            {active && <small>{active.readyState.toUpperCase()} · DMG {active.damageTaken}/{activeDef?.hp ?? '?'}</small>}
          </div>
        </div>
        {[0,1,2].map((i) => <Zone key={i} title={`RESERVE ${i+1}`} filled={Boolean(player.reserves[i])} />)}
      </div>

      <div className="task-row">
        <span className="eyebrow">TASK ZONE</span>
        {player.taskZone.map((task, i) => <div className="task-slot" key={i}>{task ?? 'EMPTY'}</div>)}
        <div className="deck-count">TASK DECK <b>{player.taskDeck.length}</b></div>
        <div className="deck-count">MAIN DECK <b>{player.hoodmonDeck.length}</b></div>
      </div>
    </section>
  )
}

function Zone({ title, filled }: { title: string; filled: boolean }) {
  return <div className={`zone ${filled ? 'filled' : ''}`}><span>{title}</span></div>
}
