import { OBJECTIVE_STARS_TO_WIN } from "./constants";
import type { GameState, PlayerId, WinnerState } from "./types";
import { otherPlayer } from "./helpers";

function playerMeetsWin(state: GameState, player: PlayerId): WinnerState | null {
  const opponent = otherPlayer(player);
  if (state.players[opponent].lp <= 0) return { player, reason: "knockout" };
  if (state.players[player].objectiveStars >= OBJECTIVE_STARS_TO_WIN) return { player, reason: "objective" };
  if (state.winner?.player === player && state.winner.reason === "deck_out") return state.winner;
  return null;
}

export function checkWinConditions(state: GameState): WinnerState | null {
  const p1 = playerMeetsWin(state, "P1");
  const p2 = playerMeetsWin(state, "P2");

  if (p1 && p2) {
    // v2.0 simultaneous victory tiebreak: remaining LP, then Objective Stars.
    if (state.players.P1.lp !== state.players.P2.lp) {
      return state.players.P1.lp > state.players.P2.lp ? p1 : p2;
    }
    if (state.players.P1.objectiveStars !== state.players.P2.objectiveStars) {
      return state.players.P1.objectiveStars > state.players.P2.objectiveStars ? p1 : p2;
    }
    // If both are still tied, play continues until the next decisive objective/LP result.
    return null;
  }

  return p1 ?? p2 ?? state.winner;
}

export function haltIfWinner(state: GameState): GameState {
  const winner = checkWinConditions(state);
  if (winner) {
    state.winner = winner;
    state.status = "game_over";
    state.reactionWindow = null;
  }
  return state;
}
