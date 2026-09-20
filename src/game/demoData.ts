import type { CardDefinition, CardInstance, GameSetup, GameState, PlayerId } from './engine/types'

export const demoDefinitions: Record<string, CardDefinition> = {
  'HDM-004': {
    id: 'HDM-004',
    name: 'Drunk Fist Wulf',
    cardType: 'hoodmon',
    stageLevel: 3,
    evolvesFrom: 'HDM-003',
    bondCost: 5,
    atk: 1600,
    hp: 2800,
    taskRating: 700,
    attacks: [
      { attackName: 'Drunk Fist Fang', baseDamage: 600 },
    ],
  },
  'HDM-066': {
    id: 'HDM-066',
    name: 'Nebulizard',
    cardType: 'hoodmon',
    stageLevel: 3,
    evolvesFrom: 'HDM-065',
    bondCost: 5,
    atk: 1600,
    hp: 2800,
    taskRating: 700,
    attacks: [
      {
        attackName: 'Nebula Veil Ambush',
        baseDamage: 600,
        conditionalDamage: [
          { condition: 'target_exhausted', replaceDamage: 800 },
          { condition: 'target_atk_reduced', replaceDamage: 800 },
        ],
      },
    ],
  },
  'HDM-003': {
    id: 'HDM-003', name: 'Bluefang Hound', cardType: 'hoodmon', stageLevel: 2,
    evolvesFrom: 'HDM-002', bondCost: 3, atk: 900, hp: 1600, taskRating: 400,
    attacks: [{ attackName: 'Bluefang Rush', baseDamage: 400 }],
  },
  'HDM-065': {
    id: 'HDM-065', name: 'Vaporgeck', cardType: 'hoodmon', stageLevel: 2,
    evolvesFrom: 'HDM-064', bondCost: 3, atk: 900, hp: 1600, taskRating: 400,
    attacks: [{ attackName: 'Vapor Strike', baseDamage: 400 }],
  },
  'HDM-TASK-A': { id: 'HDM-TASK-A', name: 'Block Check', cardType: 'task', taskTier: 'Major', taskDifficulty: 600, grantsObjectiveStar: true },
  'HDM-TASK-B': { id: 'HDM-TASK-B', name: 'Rooftop Run', cardType: 'task', taskTier: 'Street', taskDifficulty: 400, grantsObjectiveStar: false },
}

const deck = (prefix: string) => Array.from({ length: 40 }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`)
const tasks = (prefix: string) => Array.from({ length: 6 }, (_, i) => `${prefix}-TASK-${i + 1}`)

export const demoSetup: GameSetup = {
  p1Deck: deck('P1'),
  p2Deck: deck('P2'),
  p1TaskDeck: tasks('P1'),
  p2TaskDeck: tasks('P2'),
  localFaceToFaceMode: true,
}

function instance(definitionId: string, owner: PlayerId, instanceId: string): CardInstance {
  return {
    instanceId,
    definitionId,
    owner,
    controller: owner,
    readyState: 'ready',
    position: 'active',
    marked: false,
    leashed: false,
    damageTaken: 0,
    commandsUsedThisTurn: 0,
    evolutionStack: [],
    restrictions: {},
    modifiers: [],
  }
}

/** Demo-only board seed. Delete this when wiring your real setup/deploy flow. */
export function seedDemoBoard(state: GameState): void {
  state.players.P1.activeHoodmon = instance('HDM-004', 'P1', 'P1-ACTIVE')
  state.players.P2.activeHoodmon = instance('HDM-066', 'P2', 'P2-ACTIVE')
}
