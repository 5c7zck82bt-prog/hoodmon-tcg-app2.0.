import { appendLog } from './helpers'
import type { CardDefinition, CardInstance, GameState, PlayerId, Position } from './types'

export type SupportTarget = 'field' | 'magic_1' | 'magic_2' | 'magic_3' | 'trap_1' | 'trap_2'

function makeSupportInstance(definitionId: string, owner: PlayerId, position: Position, turn: number): CardInstance {
  return {
    instanceId: `${owner}-SUPPORT-${definitionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    definitionId,
    owner,
    controller: owner,
    readyState: 'ready',
    position,
    damageTaken: 0,
    commandsUsedThisTurn: 0,
    turnSet: turn,
    evolutionStack: [],
    restrictions: {},
    modifiers: [],
  }
}

export function playSupportCard(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
  target: SupportTarget,
): GameState {
  if (state.status !== 'active') throw new Error('Game is not accepting a support card right now.')
  if (state.currentPhase !== 'Main') throw new Error('Field, Standard Magic, Equipment, and set Traps are normally played during Main Phase.')
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.")

  const player = state.players[playerId]
  const handIndex = player.hand.indexOf(definitionId)
  if (handIndex < 0) throw new Error('That card is not in your hand.')

  const definition = definitions[definitionId]
  if (!definition) throw new Error('That card has not been encoded in the battle engine yet.')

  const cost = definition.bondCost ?? 0
  if (player.bond < cost) throw new Error(`Not enough Bond. ${definition.name} costs ${cost}.`)

  if (target === 'field') {
    if (definition.cardType !== 'field') throw new Error('Only a Field card can be dropped on the Field zone.')
    if (player.field) {
      player.discard.push(player.field.definitionId)
      appendLog(state, `${playerId} replaced their Field. The old Field went to Discard.`)
    }
    player.bond -= cost
    player.hand.splice(handIndex, 1)
    player.field = makeSupportInstance(definitionId, playerId, 'field', state.turnNumber)
    appendLog(state, `${playerId} played Field ${definition.name}${cost ? ` for ${cost} Bond` : ''}.`)
    return state
  }

  if (target.startsWith('trap_')) {
    if (definition.cardType !== 'trap') throw new Error('Only a Trap card can be dropped on a Trap zone.')
    const index = Number(target.split('_')[1]) - 1
    if (index < 0 || index > 1) throw new Error('Invalid Trap zone.')
    if (player.traps[index]) throw new Error('That Trap zone is occupied.')
    player.bond -= cost
    player.hand.splice(handIndex, 1)
    player.traps[index] = makeSupportInstance(definitionId, playerId, target as Position, state.turnNumber)
    appendLog(state, `${playerId} set a Trap${cost ? ` for ${cost} Bond` : ''}. It cannot normally activate this turn.`)
    return state
  }

  if (target.startsWith('magic_')) {
    if (definition.cardType !== 'magic') throw new Error('Only a Magic or Equipment card can be dropped on a Magic / Equipment zone.')
    const index = Number(target.split('_')[1]) - 1
    if (index < 0 || index > 2) throw new Error('Invalid Magic zone.')
    if (player.magic[index]) throw new Error('That Magic / Equipment zone is occupied.')

    player.bond -= cost
    player.hand.splice(handIndex, 1)

    if (!definition.magicSubtype || definition.magicSubtype === 'Standard' || definition.magicSubtype === 'Quick') {
      player.discard.push(definitionId)
      appendLog(state, `${playerId} played ${definition.name}${cost ? ` for ${cost} Bond` : ''}. It resolves as a one-shot and then goes to Discard; card-specific printed effects still require explicit engine encoding.`)
      return state
    }

    player.magic[index] = makeSupportInstance(definitionId, playerId, target as Position, state.turnNumber)
    appendLog(state, `${playerId} played ${definition.magicSubtype} ${definition.name}${cost ? ` for ${cost} Bond` : ''} into Magic / Equipment ${index + 1}.`)
    return state
  }

  throw new Error('That card cannot be played on this zone.')
}
