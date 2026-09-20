import { useGame } from '../game/GameContext'

export function BattleControls() {
  const { state, actions } = useGame()
  const reaction = state.reactionWindow

  if (state.winner) {
    return (
      <div className="victory-panel">
        <h2>{state.winner.player} WINS</h2>
        <p>{state.winner.reason.replace('_', ' ').toUpperCase()}</p>
        <button onClick={actions.restart}>NEW MATCH</button>
      </div>
    )
  }

  if (state.needsPassInterstitial) {
    return (
      <div className="pass-panel">
        <h2>PASS TO {state.viewportOwner}</h2>
        <p>Private zones stay hidden while the device changes hands.</p>
        <button onClick={actions.acknowledgePass}>READY</button>
      </div>
    )
  }

  if (state.status === 'reaction' && reaction) {
    const bothAnswered = reaction.nonActivePlayerResponded && reaction.activePlayerResponded
    return (
      <div className="controls reaction-controls">
        <span>REACTION WINDOW · Priority: {reaction.priority}</span>
        {!bothAnswered ? (
          <button onClick={() => actions.passReaction(reaction.priority)}>PASS REACTION ({reaction.priority})</button>
        ) : (
          <button onClick={actions.resolveReaction}>RESOLVE STACK</button>
        )}
      </div>
    )
  }

  return (
    <div className="controls">
      <button disabled={state.currentPhase !== 'Command'} onClick={() => actions.attack(0)}>ATTACK</button>
      <button onClick={actions.advancePhase}>NEXT PHASE</button>
      <button className="ghost" onClick={actions.restart}>RESET DEMO</button>
    </div>
  )
}
