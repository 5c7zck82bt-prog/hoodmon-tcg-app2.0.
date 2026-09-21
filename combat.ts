import { applyEffect } from "./effects";
import { appendLog, findHoodmon, otherPlayer } from "./helpers";
import { leavePlayToDiscard } from "./movement";
import { resolvePendingTask } from "./tasks";
import type { AttackDefinition, CardDefinition, GameState, PendingAttack, PlayerId } from "./types";

function ruleApplies(
  condition: AttackDefinition["conditionalDamage"] extends (infer T)[] | undefined ? T : never,
  target: ReturnType<typeof findHoodmon>,
  attacker: ReturnType<typeof findHoodmon>,
): boolean {
  if (!condition) return false;
  switch (condition.condition) {
    case "target_exhausted": return target?.readyState === "exhausted";
    case "target_atk_reduced": return Boolean(target?.modifiers.some((m) => m.stat === "atk" && m.amount < 0));
    case "attacker_evolved_this_turn": return Boolean(attacker?.evolvedThisTurn);
    case "custom": return false;
  }
}

export function calculateAttackDamage(
  attack: AttackDefinition,
  attackerDef: CardDefinition,
  attackerInstance: ReturnType<typeof findHoodmon>,
  targetInstance: ReturnType<typeof findHoodmon>,
): number {
  let damage = attack.baseDamage;
  if (attack.usesAtkInFormula) {
    damage += Math.round((attackerDef.atk ?? 0) * (attack.atkMultiplier ?? 1));
  }

  for (const rule of attack.conditionalDamage ?? []) {
    if (!ruleApplies(rule, targetInstance, attackerInstance)) continue;
    if (rule.replaceDamage !== undefined) damage = rule.replaceDamage;
    if (rule.bonusDamage !== undefined) damage += rule.bonusDamage;
  }
  return Math.max(0, damage);
}

export function declareAttack(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  attackIndex: number,
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a new command.");
  if (state.currentPhase !== "Command") throw new Error("Attacks are only legal in the Command Phase.");

  const attackerId = state.currentPlayerTurn;
  const defenderId = otherPlayer(attackerId);
  const attacker = state.players[attackerId].activeHoodmon;
  if (!attacker) throw new Error("No Active Hoodmon available to attack.");
  if (attacker.readyState !== "ready") throw new Error("Active Hoodmon is Exhausted.");
  if (attacker.restrictions.cannotAttack) throw new Error("This Hoodmon cannot attack.");
  if (attacker.commandsUsedThisTurn >= 1) throw new Error("This Hoodmon has already used its normal Command.");

  const def = definitions[attacker.definitionId];
  if (!def) throw new Error(`Missing card definition ${attacker.definitionId}.`);
  const attack = def.attacks?.[attackIndex];
  if (!attack) throw new Error("Printed attack not found.");

  attacker.readyState = "exhausted";
  attacker.commandsUsedThisTurn += 1;

  const target = state.players[defenderId].activeHoodmon;
  const pending: PendingAttack = {
    attacker: attackerId,
    attackerInstanceId: attacker.instanceId,
    defender: defenderId,
    defenderInstanceId: target?.instanceId ?? null,
    attack,
  };

  state.status = "reaction";
  state.reactionWindow = {
    openedBy: "attack",
    nonActivePlayerResponded: false,
    activePlayerResponded: false,
    priority: defenderId,
    pendingAttack: pending,
    responseStack: [],
  };
  appendLog(state, `${attackerId} declared ${attack.attackName}. Reaction Window opened.`);
  return state;
}

export function addReaction(state: GameState, by: PlayerId, effects: import("./types").EngineEffect[]): GameState {
  const window = state.reactionWindow;
  if (state.status !== "reaction" || !window) throw new Error("No Reaction Window is open.");
  if (window.priority !== by) throw new Error("That player does not have reaction priority.");

  const active = state.currentPlayerTurn;
  const nonActive = otherPlayer(active);
  if (by === nonActive) {
    if (window.nonActivePlayerResponded) throw new Error("Non-active player already used their response.");
    window.nonActivePlayerResponded = true;
    window.priority = active;
  } else {
    if (!window.nonActivePlayerResponded) throw new Error("Active player cannot answer before the opponent responds/passes.");
    if (window.activePlayerResponded) throw new Error("Active player already used their answer.");
    window.activePlayerResponded = true;
  }

  window.responseStack.push(...effects);
  appendLog(state, `${by} added a response to the Reaction Window.`);
  return state;
}

export function passReaction(state: GameState, by: PlayerId): GameState {
  const window = state.reactionWindow;
  if (state.status !== "reaction" || !window) throw new Error("No Reaction Window is open.");
  if (window.priority !== by) throw new Error("That player does not have reaction priority.");
  const active = state.currentPlayerTurn;
  const nonActive = otherPlayer(active);

  if (by === nonActive) {
    window.nonActivePlayerResponded = true;
    window.priority = active;
  } else {
    window.activePlayerResponded = true;
  }
  appendLog(state, `${by} passed reaction priority.`);
  return state;
}

function processKnockout(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  defender: PlayerId,
  targetInstanceId: string,
): void {
  const target = findHoodmon(state.players[defender], targetInstanceId);
  if (!target) return;
  const definition = definitions[target.definitionId];
  const maxHp = definition?.hp;
  if (maxHp === undefined || target.damageTaken < maxHp) return;

  appendLog(state, `${definition?.name ?? target.instanceId} was defeated.`);
  leavePlayToDiscard(state, defender, target.instanceId);

  if (state.players[defender].reserves.some(Boolean)) {
    state.pendingPromotion = defender;
    state.status = "awaiting_promotion";
    appendLog(state, `${defender} must promote a Reserve Hoodmon after the current action finishes.`);
  }
}

function resolveAttack(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  pending: PendingAttack,
): void {
  const attacker = findHoodmon(state.players[pending.attacker], pending.attackerInstanceId);
  const target = pending.defenderInstanceId
    ? findHoodmon(state.players[pending.defender], pending.defenderInstanceId)
    : null;
  if (!attacker) {
    appendLog(state, `The attacking Hoodmon left play before its attack resolved.`);
    return;
  }
  const attackerDef = definitions[attacker.definitionId];
  if (!attackerDef) throw new Error("Missing attacker definition.");
  // If an Active target existed when the attack was declared but left play during the
  // Reaction Window, the original attack does not become a direct Tamer attack automatically.
  if (pending.defenderInstanceId && !target) {
    appendLog(state, `${pending.attack.attackName} lost its declared target before resolution.`);
    return;
  }

  const damage = calculateAttackDamage(pending.attack, attackerDef, attacker, target);
  if (target) {
    applyEffect(state, { type: "damage_hoodmon", player: pending.defender, instanceId: target.instanceId, amount: damage });
    if ((state.status as GameState["status"]) !== "game_over") {
      processKnockout(state, definitions, pending.defender, target.instanceId);
    }
  } else {
    applyEffect(state, { type: "damage_lp", player: pending.defender, amount: damage });
  }
}

export function resolveReactionWindow(
  state: GameState,
  definitions: Record<string, CardDefinition>,
): GameState {
  const window = state.reactionWindow;
  if (state.status !== "reaction" || !window) throw new Error("No Reaction Window is open.");
  if (!window.nonActivePlayerResponded || !window.activePlayerResponded) {
    throw new Error("Both response opportunities must be used or passed before resolution.");
  }

  // Newest response resolves first.
  for (let i = window.responseStack.length - 1; i >= 0; i -= 1) {
    applyEffect(state, window.responseStack[i]);
    if ((state.status as GameState["status"]) === "game_over") return state;
  }

  if (window.pendingAttack) {
    resolveAttack(state, definitions, window.pendingAttack);
  } else if (window.pendingTask) {
    resolvePendingTask(state, definitions, window.pendingTask);
  }

  state.reactionWindow = null;
  if ((state.status as GameState["status"]) !== "game_over" && (state.status as GameState["status"]) !== "awaiting_promotion") {
    state.status = "active";
  }
  return state;
}
