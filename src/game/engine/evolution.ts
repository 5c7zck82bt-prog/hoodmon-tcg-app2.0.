import { appendLog, findHoodmon } from "./helpers";
import type { CardDefinition, GameState, PlayerId } from "./types";

export function evolveHoodmon(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  instanceId: string,
  nextDefinitionId: string,
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a new action.");
  if (state.currentPhase !== "Main") throw new Error("Evolution is only legal in Main Phase.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");
  if (state.round < 2) throw new Error("Evolution is locked during Round 1.");

  const card = findHoodmon(state.players[playerId], instanceId);
  if (!card) throw new Error("Hoodmon not found.");
  if (card.restrictions.cannotEvolve) throw new Error("A card effect prevents this Hoodmon from evolving.");

  const currentDef = definitions[card.definitionId];
  const nextDef = definitions[nextDefinitionId];
  if (!currentDef || !nextDef) throw new Error("Evolution definition missing.");
  if (!currentDef.stageLevel || !nextDef.stageLevel) throw new Error("Evolution stages are missing.");
  if (nextDef.stageLevel !== currentDef.stageLevel + 1) throw new Error("Evolution must advance exactly one Stage.");
  if (nextDef.stageLevel > 4) throw new Error("Stage exceeds Transcended (Stage 4).");
  if (nextDef.evolvesFrom !== currentDef.id) throw new Error("The selected card does not evolve from this Hoodmon.");

  const cost = nextDef.bondCost ?? 0;
  const player = state.players[playerId];
  if (player.bond < cost) throw new Error("Not enough Bond.");
  player.bond -= cost;

  card.evolutionStack.push(card.definitionId);
  card.definitionId = nextDefinitionId;
  card.evolvedThisTurn = true;
  // Marked/Leashed persist through evolution by canon. Runtime restrictions also persist unless an effect clears them.
  appendLog(state, `${playerId} evolved ${currentDef.name} into ${nextDef.name}.`);
  return state;
}
