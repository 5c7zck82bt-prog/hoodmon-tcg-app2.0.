import type { DragEvent } from 'react'
import { useGame } from '../game/GameContext'
import { cardById } from '../data/series1Cards'
import { canDropOnHoodmonSlot, canDropOnSupportZone, type HoodmonDropTarget } from '../game/handLegality'
import type { SupportTarget } from '../game/engine/support'
import type { CardInstance, PlayerId } from '../game/engine/types'

interface PlayerPanelProps {
  playerId: PlayerId
  opponent?: boolean
  handCardId?: string | null
  acceptHandDrops?: boolean
  onCardPlayed?: () => void
}

export function PlayerPanel({ playerId, opponent = false, handCardId = null, acceptHandDrops = false, onCardPlayed }: PlayerPanelProps) {
  const { state, definitions, actions } = useGame()
  const player = state.players[playerId]
  const isTurn = state.currentPlayerTurn === playerId
  const tamerDefinition = player.tamer ? definitions[player.tamer.definitionId] : undefined
  const tamerArt = player.tamer ? cardById[player.tamer.definitionId] : undefined

  const draggedCard = (event: DragEvent<HTMLElement>) => event.dataTransfer.getData('text/hoodmon-card-id') || handCardId || ''

  const dropSupport = (event: DragEvent<HTMLElement>, target: SupportTarget) => {
    if (!acceptHandDrops) return
    event.preventDefault()
    const cardId = draggedCard(event)
    if (!cardId) return
    actions.playSupport(cardId, target)
    onCardPlayed?.()
  }

  const clickSupport = (target: SupportTarget) => {
    if (!acceptHandDrops || !handCardId) return
    actions.playSupport(handCardId, target)
    onCardPlayed?.()
  }

  const dropHoodmon = (event: DragEvent<HTMLElement>, target: HoodmonDropTarget, occupant: CardInstance | null) => {
    if (!acceptHandDrops) return
    event.preventDefault()
    const cardId = draggedCard(event)
    if (!cardId) return
    if (occupant) actions.evolve(occupant.instanceId, cardId)
    else actions.deploy(cardId, target)
    onCardPlayed?.()
  }

  const clickHoodmon = (target: HoodmonDropTarget, occupant: CardInstance | null) => {
    if (!acceptHandDrops || !handCardId) return
    if (occupant) actions.evolve(occupant.instanceId, handCardId)
    else actions.deploy(handCardId, target)
    onCardPlayed?.()
  }

  return (
    <section className={`player-panel ${opponent ? 'opponent' : ''} ${isTurn ? 'turn-owner' : ''}`}>
      <div className="player-header">
        <div>
          <span className="eyebrow">{playerId === 'P1' ? 'PLAYER 1' : 'PLAYER 2'}</span>
          <strong>{isTurn ? '● ACTIVE TURN' : 'WAITING'}</strong>
        </div>
        <div className="stat-row">
          <span>LP <b>{player.lp}</b></span>
          <span>BOND <b>{player.bond}/10</b></span>
          <span>STARS <b>{player.objectiveStars}/4</b></span>
          <span>HAND <b>{player.hand.length}</b></span>
        </div>
      </div>

      <div className="zone-row">
        <div className={`zone tamer-zone ${player.tamer ? 'filled' : ''}`}>
          {tamerArt && <img src={tamerArt.image} alt="" />}
          <span>TAMER</span>
          <small>{tamerDefinition?.name ?? 'UNASSIGNED'}</small>
        </div>
        <SupportZone title="FIELD" card={player.field} target="field" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'field')} onDrop={dropSupport} onClick={clickSupport} />
        <SupportZone title="MAGIC / EQUIP 1" card={player.magic[0]} target="magic_1" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'magic_1')} onDrop={dropSupport} onClick={clickSupport} />
        <SupportZone title="MAGIC / EQUIP 2" card={player.magic[1]} target="magic_2" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'magic_2')} onDrop={dropSupport} onClick={clickSupport} />
        <SupportZone title="MAGIC / EQUIP 3" card={player.magic[2]} target="magic_3" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'magic_3')} onDrop={dropSupport} onClick={clickSupport} />
        <SupportZone title="TRAP 1" card={player.traps[0]} target="trap_1" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'trap_1')} onDrop={dropSupport} onClick={clickSupport} />
        <SupportZone title="TRAP 2" card={player.traps[1]} target="trap_2" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'trap_2')} onDrop={dropSupport} onClick={clickSupport} />
      </div>

      <div className="hoodmon-row">
        <HoodmonSlot card={player.activeHoodmon} title="ACTIVE HOODMON" target="active" active valid={acceptHandDrops && canDropOnHoodmonSlot(state, definitions, playerId, handCardId, 'active', player.activeHoodmon)} onDrop={dropHoodmon} onClick={clickHoodmon} />
        {player.reserves.map((card, index) => {
          const target = `reserve_${index + 1}` as HoodmonDropTarget
          return <HoodmonSlot key={index} card={card} title={`RESERVE ${index + 1}`} target={target} valid={acceptHandDrops && canDropOnHoodmonSlot(state, definitions, playerId, handCardId, target, card)} onDrop={dropHoodmon} onClick={clickHoodmon} />
        })}
      </div>

      <div className="task-row">
        <span className="eyebrow">FACE-UP TASKS · EITHER PLAYER MAY ATTEMPT</span>
        {player.taskZone.map((task, index) => {
          const definition = task ? definitions[task] : undefined
          return (
            <div className={`task-slot ${task ? 'filled' : ''}`} key={index}>
              {definition ? (
                <><b>{definition.name}</b><small>{definition.taskTier ?? 'Task'} · Difficulty {definition.taskDifficulty ?? 0}{definition.grantsObjectiveStar ? ' · ★' : ''}</small></>
              ) : 'EMPTY'}
            </div>
          )
        })}
        <div className="deck-count">TASK DECK <b>{player.taskDeck.length}</b></div>
        <div className="deck-count">MAIN DECK <b>{player.hoodmonDeck.length}</b></div>
        <div className="deck-count">DISCARD <b>{player.discard.length}</b></div>
      </div>
    </section>
  )
}

function HoodmonSlot({ card, title, target, active = false, valid, onDrop, onClick }: {
  card: CardInstance | null
  title: string
  target: HoodmonDropTarget
  active?: boolean
  valid: boolean
  onDrop: (event: DragEvent<HTMLElement>, target: HoodmonDropTarget, occupant: CardInstance | null) => void
  onClick: (target: HoodmonDropTarget, occupant: CardInstance | null) => void
}) {
  const { definitions } = useGame()
  const definition = card ? definitions[card.definitionId] : undefined
  const art = card ? cardById[card.definitionId] : undefined
  const hp = definition?.hp ?? 0
  const remainingHp = Math.max(0, hp - (card?.damageTaken ?? 0))
  const healthPct = hp > 0 ? Math.max(0, Math.min(100, (remainingHp / hp) * 100)) : 0

  const className = `hoodmon-slot ${active ? 'active-card' : 'reserve-card'} ${!card ? 'empty' : ''} ${card?.readyState === 'exhausted' ? 'exhausted' : ''} ${valid ? 'valid-drop' : ''}`

  return (
    <div
      className={className}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, target, card)}
      onClick={() => valid && onClick(target, card)}
      role={valid ? 'button' : undefined}
      tabIndex={valid ? 0 : undefined}
    >
      {!card ? (
        <><span>{title}</span><small>{valid ? 'DROP CARD HERE' : 'EMPTY'}</small></>
      ) : (
        <>
          {art && <img className="battle-card-art" src={art.image} alt="" />}
          <div className="battle-card-copy">
            <span className="eyebrow">{valid ? 'EVOLVE HERE' : title}</span>
            <strong>{definition?.name ?? card.definitionId}</strong>
            <small>{card.readyState.toUpperCase()} · HP {remainingHp}/{hp || '?'}</small>
            <div className="health-track" aria-label={`${remainingHp} of ${hp} HP`}><i style={{ width: `${healthPct}%` }} /></div>
            {definition && <small>ATK {definition.atk ?? 0} · TASK {definition.taskRating ?? 0} · CMD {card.commandsUsedThisTurn}/1</small>}
          </div>
        </>
      )}
    </div>
  )
}

function SupportZone({ title, card, target, opponent, valid, onDrop, onClick }: {
  title: string
  card: CardInstance | null
  target: SupportTarget
  opponent: boolean
  valid: boolean
  onDrop: (event: DragEvent<HTMLElement>, target: SupportTarget) => void
  onClick: (target: SupportTarget) => void
}) {
  const { definitions } = useGame()
  const definition = card ? definitions[card.definitionId] : undefined
  const art = card ? cardById[card.definitionId] : undefined
  const hiddenTrap = opponent && target.startsWith('trap_') && Boolean(card)
  return (
    <div
      className={`zone support-zone ${card ? 'filled' : ''} ${valid ? 'valid-drop' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, target)}
      onClick={() => valid && onClick(target)}
      role={valid ? 'button' : undefined}
      tabIndex={valid ? 0 : undefined}
    >
      {card ? (
        hiddenTrap ? <div className="trap-card-back"><b>♛</b><span>SET TRAP</span></div> : (
          <>
            {art && <img className="support-card-art" src={art.image} alt="" />}
            <small>{definition?.name ?? card.definitionId}</small>
          </>
        )
      ) : (
        <><span>{title}</span>{valid && <small>DROP CARD HERE</small>}</>
      )}
    </div>
  )
}
