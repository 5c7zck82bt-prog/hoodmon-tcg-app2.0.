import { findHoodmon } from "./helpers";
import type { GameState, PlayerId } from "./types";

export function moveActiveToReserve(state: GameState, playerId: PlayerId, reserveIndex: 0 | 1 | 2): GameState {
  const player = state.players[playerId];
  const active = player.activeHoodmon;
  if (!active) throw new Error("No Active Hoodmon to move.");
  if (active.restrictions.cannotRetreat) throw new Error("A card effect prevents this Hoodmon from retreating.");
  if (player.reserves[reserveIndex]) throw new Error("Reserve slot is occupied.");
  player.activeHoodmon = null;
  active.position = (`reserve_${reserveIndex + 1}`) as "reserve_1" | "reserve_2" | "reserve_3";
  player.reserves[reserveIndex] = active;
  // Marked and Leashed persist through Active/Reserve movement.
  return state;
}

export function leavePlayToDiscard(state: GameState, playerId: PlayerId, instanceId: string): GameState {
  const player = state.players[playerId];
  const card = findHoodmon(player, instanceId);
  if (!card) throw new Error("Hoodmon not found.");

  if (player.activeHoodmon?.instanceId === instanceId) player.activeHoodmon = null;
  player.reserves = player.reserves.map((c) => c?.instanceId === instanceId ? null : c) as typeof player.reserves;

  card.position = "discard";
  card.marked = false;
  card.leashed = false;
  card.restrictions = {};
  player.discard.push(...card.evolutionStack, card.definitionId);
  card.evolutionStack = [];
  return state;
}
