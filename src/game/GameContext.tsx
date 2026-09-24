import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { HoodmonEngine } from './engine/engine'
import type { CardDefinition, EngineEffect, GameSetup, GameState, PlayerId } from './engine/types'

interface GameActions {
  advancePhase: () => void
  acknowledgePass: () => void
  attack: (attackIndex?: number) => void
  passReaction: (player: PlayerId) => void
  resolveReaction: () => void
  applyEffect: (effect: EngineEffect) => void
  activateCapin: (chosenDefinitionId: string) => void
  recordOpponentReveal: (sourceDefinitionId: string) => void
  reduceHoodmonAtk: (sourceDefinitionId: string, targetPlayer: PlayerId, targetInstanceId: string, amount: number) => void
  restart: () => void
}

interface GameContextValue {
  state: GameState
  definitions: Record<string, CardDefinition>
  capinSearchCandidates: string[]
  actions: GameActions
}

const GameContext = createContext<GameContextValue | null>(null)

interface Props {
  children: ReactNode
  definitions: Record<string, CardDefinition>
  setup: GameSetup
  seed?: (state: GameState) => void
}

export function GameProvider({ children, definitions, setup, seed }: Props) {
  const engineRef = useRef<HoodmonEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new HoodmonEngine(definitions, setup)
    seed?.(engineRef.current.state)
  }

  const [state, setState] = useState<GameState>(() => structuredClone(engineRef.current!.state))

  const sync = useCallback(() => {
    setState(structuredClone(engineRef.current!.state))
  }, [])

  const guarded = useCallback((fn: () => void) => {
    try {
      fn()
      sync()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      engineRef.current!.state.eventLog.push(`UI: ${message}`)
      sync()
    }
  }, [sync])

  const actions = useMemo<GameActions>(() => ({
    advancePhase: () => guarded(() => { engineRef.current!.advancePhase() }),
    acknowledgePass: () => guarded(() => { engineRef.current!.acknowledgePass() }),
    attack: (attackIndex = 0) => guarded(() => { engineRef.current!.attack(attackIndex) }),
    passReaction: (player) => guarded(() => { engineRef.current!.passReaction(player) }),
    resolveReaction: () => guarded(() => { engineRef.current!.resolveReaction() }),
    applyEffect: (effect) => guarded(() => { engineRef.current!.effect(effect) }),
    activateCapin: (chosenDefinitionId) => guarded(() => {
      engineRef.current!.activateCapin(engineRef.current!.state.currentPlayerTurn, chosenDefinitionId)
    }),
    recordOpponentReveal: (sourceDefinitionId) => guarded(() => {
      engineRef.current!.recordOpponentReveal(engineRef.current!.state.currentPlayerTurn, sourceDefinitionId)
    }),
    reduceHoodmonAtk: (sourceDefinitionId, targetPlayer, targetInstanceId, amount) => guarded(() => {
      engineRef.current!.reduceHoodmonAtk(
        engineRef.current!.state.currentPlayerTurn,
        sourceDefinitionId,
        targetPlayer,
        targetInstanceId,
        amount,
      )
    }),
    restart: () => {
      engineRef.current = new HoodmonEngine(definitions, setup)
      seed?.(engineRef.current.state)
      sync()
    },
  }), [definitions, guarded, seed, setup, sync])

  const capinSearchCandidates = engineRef.current.capinSearchCandidates(state.currentPlayerTurn)

  return <GameContext.Provider value={{ state, definitions, capinSearchCandidates, actions }}>{children}</GameContext.Provider>
}

export function useGame() {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside GameProvider')
  return value
}
