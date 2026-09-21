import { MAX_BOND } from "./constants";
import { appendLog, findHoodmon } from "./helpers";
import type { EngineEffect, GameState } from "./types";
import { haltIfWinner } from "./win";

export function applyEffect(state: GameState, effect: EngineEffect): GameState {
  if (state.status === "game_over") return state;
  const player = state.players[effect.player];

  switch (effect.type) {
    case "damage_lp":
      player.lp = Math.max(0, player.lp - Math.max(0, effect.amount));
      appendLog(state, `${effect.player} takes ${effect.amount} LP damage.`);
      break;
    case "damage_hoodmon": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      card.damageTaken += Math.max(0, effect.amount);
      appendLog(state, `${effect.instanceId} takes ${effect.amount} damage.`);
      break;
    }
    case "exhaust": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      card.readyState = "exhausted";
      break;
    }
    case "ready": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      card.readyState = "ready";
      break;
    }
    case "gain_bond":
      player.bond = Math.min(MAX_BOND, Math.max(0, player.bond + effect.amount));
      break;
    case "gain_star":
      player.objectiveStars = Math.max(0, player.objectiveStars + effect.amount);
      appendLog(state, `${effect.player} gains ${effect.amount} Objective Star${effect.amount === 1 ? "" : "s"}.`);
      break;
    case "restrict": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      card.restrictions[effect.restriction] = effect.value;
      break;
    }
  }

  return haltIfWinner(state);
}

export function applyEffects(state: GameState, effects: EngineEffect[]): GameState {
  for (const effect of effects) {
    applyEffect(state, effect);
    if (state.status === "game_over") break;
  }
  return state;
}
