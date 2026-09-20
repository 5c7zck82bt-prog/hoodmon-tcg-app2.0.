import { applyEffects } from "./effects";
import { appendLog, findHoodmon } from "./helpers";
import type { CardDefinition, EngineEffect, GameState, PlayerId } from "./types";

export function attemptTask(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  hoodmonInstanceId: string,
  taskSlot: 0 | 1 | 2,
  taskBonus = 0,
  rewardEffects: EngineEffect[] = [],
  failureEffects: EngineEffect[] = [],
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a new command.");
  if (state.currentPhase !== "Command") throw new Error("Tasks are attempted in the Command Phase.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");

  const player = state.players[playerId];
  const hoodmon = findHoodmon(player, hoodmonInstanceId);
  if (!hoodmon) throw new Error("Tasking Hoodmon not found.");
  if (hoodmon.readyState !== "ready") throw new Error("Hoodmon is Exhausted.");
  if (hoodmon.restrictions.cannotTask) throw new Error("This Hoodmon cannot attempt Tasks.");
  if (hoodmon.commandsUsedThisTurn >= 1) throw new Error("No normal Command remains.");

  const taskId = player.taskZone[taskSlot];
  if (!taskId) throw new Error("No face-up Task in that slot.");
  const task = definitions[taskId];
  if (!task || task.cardType !== "task") throw new Error("Task definition is invalid.");

  const hoodmonDef = definitions[hoodmon.definitionId];
  const rating = (hoodmonDef?.taskRating ?? 0) + taskBonus;
  const difficulty = task.taskDifficulty ?? 0;

  hoodmon.readyState = "exhausted";
  hoodmon.commandsUsedThisTurn += 1;

  if (rating >= difficulty) {
    player.taskZone[taskSlot] = null;
    player.resolvedTasks.push(taskId);
    const effects = [...rewardEffects];
    if (task.grantsObjectiveStar) effects.push({ type: "gain_star", player: playerId, amount: 1 });
    applyEffects(state, effects);
    appendLog(state, `${playerId} completed Task ${task.name}.`);
  } else {
    applyEffects(state, failureEffects);
    appendLog(state, `${playerId} failed Task ${task.name}.`);
  }

  return state;
}
