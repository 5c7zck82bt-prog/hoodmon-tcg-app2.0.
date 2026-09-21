import { useGame } from '../game/GameContext'
import type { CardInstance, Phase, PlayerId } from '../game/engine/types'

const phaseOrder: Phase[] = ['Refresh', 'Draw', 'Bond', 'Main', 'Command', 'End']

function nextPhaseLabel(phase: Phase) {
  const index = phaseOrder.indexOf(phase)
  return phase === 'End' ? 'END TURN' : `GO TO ${phaseOrder[index + 1].toUpperCase()}`
}

const phaseHelp: Record<Phase, string> = {
  Refresh: 'All eligible cards have readied. Damage stays on Hoodmon unless an effect heals it.',
  Draw: 'Draw 1 from the 40-card Hoodmon Deck. Drawing from an empty deck loses the game.',
  Bond: 'Gain +1 Bond, up to 10. Unspent Bond carries over between turns.',
  Main: 'Deploy 1 Basic from hand, evolve any legal Active/Reserve Hoodmon from Round 2 onward, and play setup cards.',
  Command: 'Each ready Hoodmon normally gets 1 Command. Active may Battle or Task; Reserves may Task.',
  End: 'Resolve end effects, refill an empty Task source zone if needed, then pass the turn.',
}

export function BattleControls() {
  const { state, definitions, actions } = useGame()
  const reaction = state.reactionWindow

  if (state.winner) {
    return (
      <div className="victory-panel">
        <span className="eyebrow">MATCH COMPLETE</span>
        <h2>{state.winner.player} WINS</h2>
        <p>{state.winner.reason.replace('_', ' ').toUpperCase()}</p>
        <button onClick={actions.restart}>RUN IT BACK</button>
      </div>
    )
  }

  if (state.needsPassInterstitial) {
    return (
      <div className="pass-panel">
        <span className="eyebrow">LOCAL MATCH PRIVACY</span>
        <h2>PASS TO {state.viewportOwner}</h2>
        <p>Private zones stay hidden while the device changes hands.</p>
        <button onClick={actions.acknowledgePass}>I'M READY</button>
      </div>
    )
  }

  if (state.status === 'awaiting_promotion' && state.pendingPromotion) {
    const playerId = state.pendingPromotion
    const player = state.players[playerId]
    return (
      <div className="promotion-panel">
        <div>
          <span className="eyebrow">DEFEATED HOODMON</span>
          <h3>{playerId} — PROMOTE A RESERVE</h3>
          <p>The current action has finished. Choose one Reserve Hoodmon to become Active before play continues.</p>
        </div>
        <div className="promotion-actions">
          {player.reserves.map((card, index) => {
            if (!card) return null
            const definition = definitions[card.definitionId]
            return (
              <button key={card.instanceId} onClick={() => actions.promote(playerId, index as 0 | 1 | 2)}>
                PROMOTE {definition?.name ?? `RESERVE ${index + 1}`}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (state.status === 'reaction' && reaction) {
    const bothAnswered = reaction.nonActivePlayerResponded && reaction.activePlayerResponded
    const actionName = reaction.openedBy === 'attack' ? 'ATTACK' : reaction.openedBy === 'task' ? 'TASK' : reaction.openedBy.toUpperCase()
    return (
      <div className="controls reaction-controls">
        <div className="control-copy">
          <span className="eyebrow">REACTION WINDOW · {actionName}</span>
          <strong>Priority: {reaction.priority}</strong>
          <small>Non-active player gets one legal Trap/Quick response; active player may answer once. Newest response resolves first.</small>
        </div>
        {!bothAnswered ? (
          <button onClick={() => actions.passReaction(reaction.priority)}>PASS REACTION ({reaction.priority})</button>
        ) : (
          <button onClick={actions.resolveReaction}>RESOLVE {actionName}</button>
        )}
      </div>
    )
  }

  const playerId = state.currentPlayerTurn
  const player = state.players[playerId]
  const hoodmon = [player.activeHoodmon, ...player.reserves].filter((card): card is CardInstance => Boolean(card))
  const active = player.activeHoodmon
  const activeDefinition = active ? definitions[active.definitionId] : undefined

  const visibleTasks = (['P1', 'P2'] as PlayerId[]).flatMap((owner) =>
    state.players[owner].taskZone.flatMap((taskId, index) => {
      if (!taskId) return []
      const definition = definitions[taskId]
      if (!definition) return []
      return [{ owner, slot: index as 0 | 1 | 2, definition }]
    }),
  )

  const readyTaskers = hoodmon.filter((card) =>
    card.readyState === 'ready'
    && card.commandsUsedThisTurn < 1
    && !card.restrictions.cannotTask,
  )

  const canAttack = state.currentPhase === 'Command'
    && Boolean(active)
    && active?.readyState === 'ready'
    && (active?.commandsUsedThisTurn ?? 0) < 1
    && !active?.restrictions.cannotAttack
    && Boolean(activeDefinition?.attacks?.length)

  return (
    <div className="turn-console">
      <div className="turn-guidance">
        <span className="eyebrow">{playerId} · ROUND {state.round} · {state.currentPhase.toUpperCase()} PHASE</span>
        <strong>{phaseHelp[state.currentPhase]}</strong>
        <small>
          {activeDefinition
            ? `${activeDefinition.name} is Active · ${active?.readyState.toUpperCase()} · ${active?.commandsUsedThisTurn ?? 0}/1 normal Command used`
            : 'No Active Hoodmon. A legal Basic deployment can enter Active during Main; otherwise the Tamer can be attacked directly.'}
        </small>
      </div>

      <div className="controls primary-controls">
        {state.currentPhase === 'Main' && (
          <div className="action-group drag-play-guidance">
            <span className="action-group-title">PLAY FROM HAND · DRAG & DROP</span>
            <strong>{player.normalDeployUsed ? 'NORMAL DEPLOY USED' : 'NORMAL DEPLOY AVAILABLE'}</strong>
            <small>Drag a Basic Hoodmon to an open legal Hoodmon zone, an evolution card onto its matching Hoodmon, or a Field / Magic / Trap onto its matching support zone. Legal destinations glow.</small>
            {state.round < 2 && <small>Evolution remains locked until Round 2.</small>}
          </div>
        )}

        {state.currentPhase === 'Command' && (
          <>
            <div className="action-group">
              <span className="action-group-title">BATTLE COMMAND · ACTIVE ONLY</span>
              <button disabled={!canAttack} onClick={() => actions.attack(0)}>
                {activeDefinition?.attacks?.[0] ? `ATTACK · ${activeDefinition.attacks[0].attackName} · ${activeDefinition.attacks[0].baseDamage} DMG` : 'NO LEGAL ATTACK'}
              </button>
            </div>

            <div className="action-group task-command-grid">
              <span className="action-group-title">TASK COMMAND · ACTIVE OR RESERVE · EITHER FACE-UP TASK</span>
              {readyTaskers.length === 0 && <small>No ready Hoodmon has a normal Command available.</small>}
              {visibleTasks.length === 0 && <small>No face-up Task is available.</small>}
              {readyTaskers.flatMap((card) => {
                const definition = definitions[card.definitionId]
                return visibleTasks.map((task) => (
                  <button
                    className="ghost"
                    key={`task-${card.instanceId}-${task.owner}-${task.slot}`}
                    onClick={() => actions.attemptTask(card.instanceId, task.owner, task.slot)}
                  >
                    {definition?.name ?? card.definitionId} TASK {definition?.taskRating ?? 0} → {task.owner} {task.definition.name} ({task.definition.taskDifficulty ?? 0})
                  </button>
                ))
              })}
            </div>
          </>
        )}

        <button className="advance" onClick={actions.advancePhase}>{nextPhaseLabel(state.currentPhase)}</button>
        <button className="ghost reset-match" onClick={actions.restart}>RESET MATCH</button>
      </div>
    </div>
  )
}
