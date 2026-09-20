import { OBJECTIVE_STARS_TO_WIN } from "./constants";
import type { GameState, PlayerId, WinnerState } from "./types";
import { otherPlayer } from "./helpers";

export function checkWinConditions(state: GameState): WinnerState | null {
  const ids: PlayerId[] = ["P1", "P2"];

  for (const id of ids) {
    if (state.players[id].lp <= 0) {
      return { player: otherPlayer(id), reason: "knockout" };
    }
  }

  for (const id of ids) {
    if (state.players[id].objectiveStars >= OBJECTIVE_STARS_TO_WIN) {
      return { player: id, reason: "objective" };
    }
  }

  return state.winner;
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
