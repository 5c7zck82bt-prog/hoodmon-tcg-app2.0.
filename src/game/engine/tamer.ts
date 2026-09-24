import { MAX_BOND } from "./constants";
import { appendLog, findHoodmon } from "./helpers";
import type { CardDefinition, GameState, Modifier, PlayerId } from "./types";

const CAPIN_ID = "HDM-078";
const TRUTH_AMPLIFIER_KEY = `${CAPIN_ID}:truth-amplifier`;

export type CapinTriggerEvent = "reveal_opponent_card" | "reduce_hoodmon_atk";

const normalize = (value: string | undefined) => (value ?? "").trim().toLowerCase();
const hasToken = (values: string[] | undefined, token: string) =>
  (values ?? []).some((value) => normalize(value).includes(token));

export function isCapinSearchTarget(definition: CardDefinition): boolean {
  const name = normalize(definition.name);
  const family = normalize(definition.family);
  const rulesText = normalize(definition.rulesText);
  const truthNetwork = family.includes("truth network") || hasToken(definition.archetypeTags, "truth network");
  const research = name.includes("research") || hasToken(definition.archetypeTags, "research") || rulesText.includes("research");
  const oracle = name.includes("oracle") || hasToken(definition.archetypeTags, "oracle") || name === "monical";
  return (truthNetwork && research) || oracle;
}

export function getCapinSearchCandidates(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): string[] {
  const player = state.players[playerId];
  if (player.tamer?.definitionId !== CAPIN_ID || player.tamer.readyState !== "ready") return [];
  return [...new Set(player.hoodmonDeck.filter((id) => definitions[id] && isCapinSearchTarget(definitions[id])))];
}

function shuffle<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function activateCapin(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  chosenDefinitionId: string,
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a Tamer activation.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");
  if (state.currentPhase !== "Main") throw new Error("Tamer Activate effects are used during the Main Phase.");

  const player = state.players[playerId];
  const tamer = player.tamer;
  if (tamer?.definitionId !== CAPIN_ID) throw new Error("Capin MDH is not this player's Tamer.");
  if (tamer.readyState !== "ready") throw new Error("Capin MDH is Exhausted.");

  const definition = definitions[chosenDefinitionId];
  const deckIndex = player.hoodmonDeck.indexOf(chosenDefinitionId);
  if (deckIndex < 0 || !definition || !isCapinSearchTarget(definition)) {
    throw new Error("Selected card is not a legal Truth Network: Research or Oracle search target.");
  }

  tamer.readyState = "exhausted";
  player.hoodmonDeck.splice(deckIndex, 1);
  player.hand.push(chosenDefinitionId);
  shuffle(player.hoodmonDeck);
  appendLog(state, `${playerId} exhausted Capin MDH, revealed ${definition.name}, added it to hand, then shuffled.`);
  return state;
}

function isQualifyingTruthAmplifierSource(source: CardDefinition | undefined): boolean {
  if (!source) return false;
  return source.cardType === "trap"
    || hasToken(source.alignment, "psychic")
    || hasToken(source.archetypeTags, "research")
    || normalize(source.name).includes("research");
}

export function triggerCapinTruthAmplifier(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  sourceDefinitionId: string,
  event: CapinTriggerEvent,
): boolean {
  const player = state.players[playerId];
  if (player.tamer?.definitionId !== CAPIN_ID) return false;
  if (!isQualifyingTruthAmplifierSource(definitions[sourceDefinitionId])) return false;
  if (player.oncePerTurnUsage[TRUTH_AMPLIFIER_KEY] === state.turnNumber) return false;

  player.oncePerTurnUsage[TRUTH_AMPLIFIER_KEY] = state.turnNumber;
  player.bond = Math.min(MAX_BOND, player.bond + 1);
  appendLog(state, `${playerId} triggered Capin MDH — Truth Amplifier (${event}) and gained 1 Bond.`);
  return true;
}

export function recordOpponentCardReveal(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  sourceDefinitionId: string,
): boolean {
  return triggerCapinTruthAmplifier(state, definitions, playerId, sourceDefinitionId, "reveal_opponent_card");
}

export function reduceHoodmonAtkWithCapinCheck(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  sourceDefinitionId: string,
  targetPlayerId: PlayerId,
  targetInstanceId: string,
  amount: number,
  duration: Modifier["duration"] = "until_end_of_turn",
): GameState {
  if (amount <= 0) throw new Error("ATK reduction must be greater than 0.");
  const target = findHoodmon(state.players[targetPlayerId], targetInstanceId);
  if (!target) throw new Error("Target Hoodmon not found.");

  target.modifiers.push({
    id: `${sourceDefinitionId}:atk-down:${state.turnNumber}:${target.modifiers.length}`,
    sourceCardId: sourceDefinitionId,
    stat: "atk",
    amount: -Math.abs(amount),
    duration,
    expiresOnTurn: duration === "until_end_of_next_turn" ? state.turnNumber + 1 : undefined,
  });
  appendLog(state, `${targetInstanceId} gets -${amount} ATK from ${sourceDefinitionId}.`);
  triggerCapinTruthAmplifier(state, definitions, playerId, sourceDefinitionId, "reduce_hoodmon_atk");
  return state;
}
