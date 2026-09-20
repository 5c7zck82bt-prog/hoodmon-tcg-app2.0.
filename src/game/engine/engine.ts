import {
  STANDARD_STARTING_BOND,
  STANDARD_STARTING_LP,
  TASK_DECK_SIZE,
} from "./constants";
import { applyEffect } from "./effects";
import { advancePhase, acknowledgePassInterstitial, enterPhase } from "./fsm";
import type { CardDefinition, EngineEffect, GameSetup, GameState, PlayerId, PlayerState } from "./types";
import { declareAttack, addReaction, passReaction, resolveReactionWindow } from "./combat";
import { evolveHoodmon } from "./evolution";
import { attemptTask } from "./tasks";
import { moveActiveToReserve, leavePlayToDiscard } from "./movement";
import { haltIfWinner } from "./win";

function makePlayer(id: PlayerId, deck: string[], taskDeck: string[]): PlayerState {
  if (taskDeck.length !== TASK_DECK_SIZE) throw new Error(`Each player must bring exactly ${TASK_DECK_SIZE} Task cards.`);
  return {
    id,
    lp: STANDARD_STARTING_LP,
    maxLp: STANDARD_STARTING_LP,
    bond: STANDARD_STARTING_BOND,
    objectiveStars: 0,
    hoodmonDeck: [...deck],
    hand: [],
    discard: [],
    banished: [],
    tamer: null,
    activeHoodmon: null,
    reserves: [null, null, null],
    magic: [null, null, null],
    traps: [null, null],
    field: null,
    taskDeck: [...taskDeck],
    taskZone: [null, null, null],
    resolvedTasks: [],
  };
}

export function createGame(setup: GameSetup): GameState {
  const state: GameState = {
    status: "active",
    currentPlayerTurn: "P1",
    currentPhase: "Refresh",
    round: 1,
    turnNumber: 1,
    players: {
      P1: makePlayer("P1", setup.p1Deck, setup.p1TaskDeck),
      P2: makePlayer("P2", setup.p2Deck, setup.p2TaskDeck),
    },
    reactionWindow: null,
    winner: null,
    localFaceToFaceMode: setup.localFaceToFaceMode ?? false,
    viewportOwner: "P1",
    needsPassInterstitial: false,
    eventLog: [],
  };

  // Core setup: reveal one Task from each player's separate Task Deck.
  state.players.P1.taskZone[0] = state.players.P1.taskDeck.shift() ?? null;
  state.players.P2.taskZone[0] = state.players.P2.taskDeck.shift() ?? null;
  return enterPhase(state, "Refresh");
}

export class HoodmonEngine {
  public state: GameState;
  constructor(public readonly definitions: Record<string, CardDefinition>, setup: GameSetup) {
    this.state = createGame(setup);
  }

  advancePhase() { this.state = advancePhase(this.state); return this.state; }
  acknowledgePass() { this.state = acknowledgePassInterstitial(this.state); return this.state; }
  attack(index: number) { this.state = declareAttack(this.state, this.definitions, index); return this.state; }
  react(player: PlayerId, effects: EngineEffect[]) { this.state = addReaction(this.state, player, effects); return this.state; }
  passReaction(player: PlayerId) { this.state = passReaction(this.state, player); return this.state; }
  resolveReaction() { this.state = resolveReactionWindow(this.state, this.definitions); return this.state; }
  evolve(player: PlayerId, instanceId: string, nextDefinitionId: string) {
    this.state = evolveHoodmon(this.state, this.definitions, player, instanceId, nextDefinitionId); return haltIfWinner(this.state);
  }
  task(player: PlayerId, instanceId: string, slot: 0|1|2, bonus = 0, rewards: EngineEffect[] = [], failures: EngineEffect[] = []) {
    this.state = attemptTask(this.state, this.definitions, player, instanceId, slot, bonus, rewards, failures); return haltIfWinner(this.state);
  }
  effect(effect: EngineEffect) { this.state = applyEffect(this.state, effect); return this.state; }
  retreat(player: PlayerId, reserveIndex: 0|1|2) { this.state = moveActiveToReserve(this.state, player, reserveIndex); return this.state; }
  discardHoodmon(player: PlayerId, instanceId: string) { this.state = leavePlayToDiscard(this.state, player, instanceId); return this.state; }
}
