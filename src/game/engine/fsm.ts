import { MAX_BOND, PHASES } from "./constants";
import { appendLog, allHoodmon, otherPlayer } from "./helpers";
import type { GameState, Phase, PlayerId } from "./types";
import { haltIfWinner } from "./win";

function nextPhase(phase: Phase): Phase {
  const i = PHASES.indexOf(phase);
  return PHASES[(i + 1) % PHASES.length];
}

function refreshPlayer(state: GameState, playerId: PlayerId): void {
  const p = state.players[playerId];
  for (const card of allHoodmon(p)) {
    card.readyState = "ready";
    card.commandsUsedThisTurn = 0;
    card.evolvedThisTurn = false;
    card.modifiers = card.modifiers.filter((m) => m.duration !== "until_end_of_turn" && (m.expiresOnTurn ?? Infinity) > state.turnNumber);
  }
  if (p.tamer) p.tamer.readyState = "ready";
}

function drawOne(state: GameState, playerId: PlayerId): void {
  const p = state.players[playerId];
  if (p.hoodmonDeck.length === 0) {
    state.winner = { player: otherPlayer(playerId), reason: "deck_out" };
    state.status = "game_over";
    return;
  }
  const card = p.hoodmonDeck.shift()!;
  p.hand.push(card);
}

function refillTaskZoneIfEmpty(state: GameState, playerId: PlayerId): void {
  const p = state.players[playerId];
  if (p.taskZone.some(Boolean)) return;
  if (p.taskDeck.length === 0) return;
  p.taskZone[0] = p.taskDeck.shift()!;
}

export function enterPhase(state: GameState, phase: Phase): GameState {
  if (state.status === "game_over") return state;
  state.currentPhase = phase;
  const id = state.currentPlayerTurn;

  switch (phase) {
    case "Refresh":
      refreshPlayer(state, id);
      break;
    case "Draw":
      drawOne(state, id);
      break;
    case "Bond":
      state.players[id].bond = Math.min(MAX_BOND, state.players[id].bond + 1);
      break;
    case "Main":
    case "Command":
      break;
    case "End":
      refillTaskZoneIfEmpty(state, id);
      break;
  }

  appendLog(state, `${id} entered ${phase} Phase.`);
  return haltIfWinner(state);
}

export function advancePhase(state: GameState): GameState {
  if (state.status !== "active") throw new Error("Cannot advance phase while the engine is paused for reactions, promotion, or game over.");

  if (state.currentPhase !== "End") {
    return enterPhase(state, nextPhase(state.currentPhase));
  }

  const outgoing = state.currentPlayerTurn;
  const incoming = otherPlayer(outgoing);
  state.currentPlayerTurn = incoming;
  state.turnNumber += 1;
  if (outgoing === "P2") state.round += 1;

  if (state.localFaceToFaceMode) {
    state.viewportOwner = incoming;
    state.needsPassInterstitial = true;
  }

  return enterPhase(state, "Refresh");
}

export function acknowledgePassInterstitial(state: GameState): GameState {
  state.needsPassInterstitial = false;
  return state;
}
