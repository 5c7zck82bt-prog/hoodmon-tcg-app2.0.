import type { CardDefinition, CardInstance, GameState, PlayerId } from './engine/types'
import type { SupportTarget } from './engine/support'

export type HoodmonDropTarget = 'active' | 'reserve_1' | 'reserve_2' | 'reserve_3'
export type BattleDropTarget = HoodmonDropTarget | SupportTarget

export function canDropOnHoodmonSlot(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  cardId: string | null,
  target: HoodmonDropTarget,
  occupant: CardInstance | null,
): boolean {
  if (!cardId || state.status !== 'active' || state.currentPlayerTurn !== playerId || state.currentPhase !== 'Main') return false
  const player = state.players[playerId]
  if (!player.hand.includes(cardId)) return false
  const definition = definitions[cardId]
  if (!definition || definition.cardType !== 'hoodmon') return false
  if (player.bond < (definition.bondCost ?? 0)) return false

  if (occupant) {
    if (state.round < 2 || occupant.restrictions.cannotEvolve) return false
    const current = definitions[occupant.definitionId]
    return Boolean(
      current?.stageLevel
      && definition.stageLevel === current.stageLevel + 1
      && definition.evolvesFrom === current.id,
    )
  }

  if (definition.stageLevel !== 1 || player.normalDeployUsed) return false
  if (target === 'active') return !player.activeHoodmon
  if (!player.activeHoodmon) return false
  const index = Number(target.split('_')[1]) - 1
  return index >= 0 && index <= 2 && !player.reserves[index]
}

export function canDropOnSupportZone(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  cardId: string | null,
  target: SupportTarget,
): boolean {
  if (!cardId || state.status !== 'active' || state.currentPlayerTurn !== playerId || state.currentPhase !== 'Main') return false
  const player = state.players[playerId]
  if (!player.hand.includes(cardId)) return false
  const definition = definitions[cardId]
  if (!definition || player.bond < (definition.bondCost ?? 0)) return false

  if (target === 'field') return definition.cardType === 'field'
  if (target.startsWith('trap_')) {
    if (definition.cardType !== 'trap') return false
    const index = Number(target.split('_')[1]) - 1
    return index >= 0 && index <= 1 && !player.traps[index]
  }
  if (target.startsWith('magic_')) {
    if (definition.cardType !== 'magic') return false
    const index = Number(target.split('_')[1]) - 1
    return index >= 0 && index <= 2 && !player.magic[index]
  }
  return false
}
