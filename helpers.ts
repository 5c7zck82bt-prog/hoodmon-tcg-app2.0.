import type { CardInstance, GameState, PlayerId, PlayerState } from "./types";

export const otherPlayer = (id: PlayerId): PlayerId => (id === "P1" ? "P2" : "P1");

export function allHoodmon(player: PlayerState): CardInstance[] {
  return [player.activeHoodmon, ...player.reserves].filter((x): x is CardInstance => Boolean(x));
}

export function findHoodmon(player: PlayerState, instanceId: string): CardInstance | null {
  return allHoodmon(player).find((c) => c.instanceId === instanceId) ?? null;
}

export function cloneState<T>(value: T): T {
  return structuredClone(value);
}

export function appendLog(state: GameState, entry: string): void {
  state.eventLog.push(entry);
  if (state.eventLog.length > 300) state.eventLog.shift();
}
