import { applyEffect } from "./effects";
import { appendLog, findHoodmon, otherPlayer } from "./helpers";
import type { AttackDefinition, CardDefinition, GameState, PendingAttack, PlayerId } from "./types";

function ruleApplies(
  condition: AttackDefinition["conditionalDamage"] extends (infer T)[] | undefined ? T : never,
  target: ReturnType<typeof findHoodmon>,
  attacker: ReturnType<typeof findHoodmon>,
): boolean {
  if (!condition) return false;
  switch (condition.condition) {
    case "target_marked": return Boolean(target?.marked);
    case "target_leashed": return Boolean(target?.leashed);
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
  // Canon rule: printed attack damage is the default. ATK is reference data only.
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
  return state;
}

export function resolveReactionWindow(
  state: GameState,
  definitions: Record<string, CardDefinition>,
): GameState {
  const window = state.reactionWindow;
  if (state.status !== "reaction" || !window) throw new Error("No Reaction Window is open.");
  if (!window.nonActivePlayerResponded || !window.activePlayerResponded) {
    throw new Error("Both reaction opportunities must be answered or passed before resolution.");
  }

  // Newest response resolves first.
  for (let i = window.responseStack.length - 1; i >= 0; i--) {
    applyEffect(state, window.responseStack[i]);
    if ((state.status as GameState["status"]) === "game_over") return state;
  }

  const pending = window.pendingAttack;
  if (pending) {
    const attacker = findHoodmon(state.players[pending.attacker], pending.attackerInstanceId);
    const target = pending.defenderInstanceId
      ? findHoodmon(state.players[pending.defender], pending.defenderInstanceId)
      : null;
    if (!attacker) throw new Error("Attacking Hoodmon left play before attack resolution.");
    const attackerDef = definitions[attacker.definitionId];
    if (!attackerDef) throw new Error("Missing attacker definition.");
    const damage = calculateAttackDamage(pending.attack, attackerDef, attacker, target);
    if (target) {
      applyEffect(state, { type: "damage_hoodmon", player: pending.defender, instanceId: target.instanceId, amount: damage });
    } else {
      applyEffect(state, { type: "damage_lp", player: pending.defender, amount: damage });
    }
  }

  if ((state.status as GameState["status"]) !== "game_over") state.status = "active";
  state.reactionWindow = null;
  return state;
}
