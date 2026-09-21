export type PlayerId = "P1" | "P2";
export type Phase = "Refresh" | "Draw" | "Bond" | "Main" | "Command" | "End";
export type EngineStatus = "active" | "reaction" | "awaiting_promotion" | "game_over";
export type ReadyState = "ready" | "exhausted";
export type Position =
  | "tamer"
  | "active"
  | "reserve_1"
  | "reserve_2"
  | "reserve_3"
  | "discard"
  | "banished"
  | "field"
  | "magic_1"
  | "magic_2"
  | "magic_3"
  | "trap_1"
  | "trap_2";
export type CardType = "tamer" | "hoodmon" | "magic" | "trap" | "field" | "task";
export type StageLevel = 1 | 2 | 3 | 4;

export interface ConditionalDamageRule {
  condition:
    | "target_exhausted"
    | "target_atk_reduced"
    | "attacker_evolved_this_turn"
    | "custom";
  replaceDamage?: number;
  bonusDamage?: number;
  customKey?: string;
}

export interface AttackDefinition {
  attackName: string;
  baseDamage: number;
  cost?: number;
  usesAtkInFormula?: boolean;
  atkMultiplier?: number;
  conditionalDamage?: ConditionalDamageRule[];
}

export interface CardDefinition {
  id: string;
  name: string;
  cardType: CardType;
  stageLevel?: StageLevel;
  evolvesFrom?: string | null;
  bondCost?: number;
  atk?: number;
  hp?: number;
  taskRating?: number;
  attacks?: AttackDefinition[];
  grantsObjectiveStar?: boolean;
  taskDifficulty?: number;
  taskTier?: "Street" | "Major" | "Crisis";
  magicSubtype?: "Standard" | "Quick" | "Continuous" | "Equipment";
}

export interface RuntimeRestrictions {
  cannotEvolve?: boolean;
  cannotRetreat?: boolean;
  cannotAttack?: boolean;
  cannotTask?: boolean;
}

export interface Modifier {
  id: string;
  sourceCardId: string;
  stat: "atk" | "hp" | "task" | "attack_damage";
  amount: number;
  duration: "until_end_of_turn" | "until_end_of_next_turn" | "persistent";
  expiresOnTurn?: number;
}

export interface CardInstance {
  instanceId: string;
  definitionId: string;
  owner: PlayerId;
  controller: PlayerId;
  readyState: ReadyState;
  position: Position;
  damageTaken: number;
  commandsUsedThisTurn: number;
  turnSet?: number;
  evolvedThisTurn?: boolean;
  evolutionStack: string[];
  restrictions: RuntimeRestrictions;
  modifiers: Modifier[];
}

export interface PlayerState {
  id: PlayerId;
  lp: number;
  maxLp: number;
  bond: number;
  objectiveStars: number;
  hoodmonDeck: string[];
  hand: string[];
  discard: string[];
  banished: string[];
  tamer: CardInstance | null;
  activeHoodmon: CardInstance | null;
  reserves: [CardInstance | null, CardInstance | null, CardInstance | null];
  magic: [CardInstance | null, CardInstance | null, CardInstance | null];
  traps: [CardInstance | null, CardInstance | null];
  field: CardInstance | null;
  taskDeck: string[];
  taskZone: [string | null, string | null, string | null];
  resolvedTasks: string[];
  normalDeployUsed: boolean;
}

export interface PendingAttack {
  attacker: PlayerId;
  attackerInstanceId: string;
  defender: PlayerId;
  defenderInstanceId: string | null;
  attack: AttackDefinition;
}

export interface PendingTask {
  player: PlayerId;
  hoodmonInstanceId: string;
  taskOwner: PlayerId;
  taskSlot: 0 | 1 | 2;
  taskId: string;
  taskBonus: number;
  rewardEffects: EngineEffect[];
  failureEffects: EngineEffect[];
}

export interface ReactionWindow {
  openedBy: "attack" | "task" | "evolution" | "effect";
  nonActivePlayerResponded: boolean;
  activePlayerResponded: boolean;
  priority: PlayerId;
  pendingAttack?: PendingAttack;
  pendingTask?: PendingTask;
  responseStack: EngineEffect[];
}

export type EngineEffect =
  | { type: "damage_lp"; player: PlayerId; amount: number }
  | { type: "damage_hoodmon"; player: PlayerId; instanceId: string; amount: number }
  | { type: "exhaust"; player: PlayerId; instanceId: string }
  | { type: "ready"; player: PlayerId; instanceId: string }
  | { type: "gain_bond"; player: PlayerId; amount: number }
  | { type: "gain_star"; player: PlayerId; amount: number }
  | { type: "restrict"; player: PlayerId; instanceId: string; restriction: keyof RuntimeRestrictions; value: boolean };

export interface WinnerState {
  player: PlayerId;
  reason: "knockout" | "objective" | "deck_out";
}

export interface GameState {
  status: EngineStatus;
  currentPlayerTurn: PlayerId;
  currentPhase: Phase;
  round: number;
  turnNumber: number;
  players: Record<PlayerId, PlayerState>;
  reactionWindow: ReactionWindow | null;
  pendingPromotion: PlayerId | null;
  winner: WinnerState | null;
  localFaceToFaceMode: boolean;
  viewportOwner: PlayerId;
  needsPassInterstitial: boolean;
  eventLog: string[];
}

export interface GameSetup {
  p1Deck: string[];
  p2Deck: string[];
  p1TaskDeck: string[];
  p2TaskDeck: string[];
  p1TamerId?: string;
  p2TamerId?: string;
  localFaceToFaceMode?: boolean;
  firstPlayer?: PlayerId;
  shuffleDecks?: boolean;
}
