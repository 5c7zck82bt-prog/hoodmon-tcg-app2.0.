import type { Phase } from "./types";

export const STANDARD_STARTING_LP = 2500;
export const STANDARD_STARTING_BOND = 5;
export const MAX_BOND = 10;
export const OBJECTIVE_STARS_TO_WIN = 3;
export const MAIN_DECK_SIZE = 40;
export const TASK_DECK_SIZE = 6;
export const TASK_ZONE_SLOTS = 3;
export const MAGIC_ZONE_SLOTS = 3;
export const TRAP_ZONE_SLOTS = 2;
export const MAX_RESERVES = 3;
export const MAX_STAGE = 4;

export const PHASES: readonly Phase[] = [
  "Refresh",
  "Draw",
  "Bond",
  "Main",
  "Command",
  "End",
] as const;
