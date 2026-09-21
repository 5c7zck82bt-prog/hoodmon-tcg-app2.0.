import { applyEffects } from "./effects";
import { appendLog, findHoodmon, otherPlayer } from "./helpers";
import type { CardDefinition, EngineEffect, GameState, PendingTask, PlayerId } from "./types";

export function declareTask(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  hoodmonInstanceId: string,
  taskOwner: PlayerId,
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
  if (hoodmon.commandsUsedThisTurn >= 1) throw new Error("No normal Command remains for that Hoodmon.");

  const taskId = state.players[taskOwner].taskZone[taskSlot];
  if (!taskId) throw new Error("No face-up Task in that slot.");
  const task = definitions[taskId];
  if (!task || task.cardType !== "task") throw new Error("Task definition is invalid.");

  hoodmon.readyState = "exhausted";
  hoodmon.commandsUsedThisTurn += 1;

  const pendingTask: PendingTask = {
    player: playerId,
    hoodmonInstanceId,
    taskOwner,
    taskSlot,
    taskId,
    taskBonus,
    rewardEffects,
    failureEffects,
  };

  state.status = "reaction";
  state.reactionWindow = {
    openedBy: "task",
    nonActivePlayerResponded: false,
    activePlayerResponded: false,
    priority: otherPlayer(playerId),
    pendingTask,
    responseStack: [],
  };
  appendLog(state, `${playerId} declared a Task Command on ${task.name}. Reaction Window opened.`);
  return state;
}

export function resolvePendingTask(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  pending: PendingTask,
): GameState {
  const sourcePlayer = state.players[pending.taskOwner];
  const currentTaskId = sourcePlayer.taskZone[pending.taskSlot];
  if (currentTaskId !== pending.taskId) {
    appendLog(state, `The declared Task left its slot before resolution; the attempt ends.`);
    return state;
  }

  const hoodmon = findHoodmon(state.players[pending.player], pending.hoodmonInstanceId);
  if (!hoodmon) {
    appendLog(state, `The Tasking Hoodmon left play before the Task resolved.`);
    return state;
  }

  const task = definitions[pending.taskId];
  const hoodmonDef = definitions[hoodmon.definitionId];
  if (!task || task.cardType !== "task") throw new Error("Task definition is invalid at resolution.");

  const rating = (hoodmonDef?.taskRating ?? 0) + pending.taskBonus;
  const difficulty = task.taskDifficulty ?? 0;

  if (rating >= difficulty) {
    sourcePlayer.taskZone[pending.taskSlot] = null;
    sourcePlayer.resolvedTasks.push(pending.taskId);
    const effects = [...pending.rewardEffects];
    if (task.grantsObjectiveStar) effects.push({ type: "gain_star", player: pending.player, amount: 1 });
    applyEffects(state, effects);
    appendLog(state, `${pending.player} completed ${task.name} with TASK ${rating} vs Difficulty ${difficulty}.`);
  } else {
    applyEffects(state, pending.failureEffects);
    appendLog(state, `${pending.player} failed ${task.name} with TASK ${rating} vs Difficulty ${difficulty}. The Task remains face-up.`);
  }

  return state;
}
