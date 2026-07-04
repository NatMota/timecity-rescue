import { NODE_BY_KEY } from "./fixedGraph";
import type {
  Choice,
  ChoiceClassification,
  StateSummary,
  WorldState,
  WorldStateDelta,
} from "./types";

export const INITIAL_WORLD_STATE: WorldState = {
  clock_offset_minutes: 1,
  trains: { dispatched_unsafe: 3, safe_runs: 0 },
  battery_pct: 42,
  cargo: { medicine: "at_risk", glass: "at_risk", heavy: "at_risk" },
  city_stability: 55,
  nix_influence: 2,
  flags: ["clocks_split", "reactor_loop_active", "telegraph_ambiguous"],
};

const MAX_MEMORY = 3;

export function normalizeWorldState(value: Partial<WorldState> | null | undefined): WorldState {
  const base = INITIAL_WORLD_STATE;
  return {
    clock_offset_minutes: clampNumber(value?.clock_offset_minutes ?? base.clock_offset_minutes, 0, 5),
    trains: {
      dispatched_unsafe: Math.max(0, value?.trains?.dispatched_unsafe ?? base.trains.dispatched_unsafe),
      safe_runs: Math.max(0, value?.trains?.safe_runs ?? base.trains.safe_runs),
    },
    battery_pct: clampNumber(value?.battery_pct ?? base.battery_pct, 0, 100),
    cargo: {
      medicine: value?.cargo?.medicine ?? base.cargo.medicine,
      glass: value?.cargo?.glass ?? base.cargo.glass,
      heavy: value?.cargo?.heavy ?? base.cargo.heavy,
    },
    city_stability: clampNumber(value?.city_stability ?? base.city_stability, 0, 100),
    nix_influence: clampNumber(value?.nix_influence ?? base.nix_influence, 0, 10),
    flags: Array.from(new Set(value?.flags ?? base.flags)),
  };
}

export function applyWorldStateDelta(worldState: WorldState, delta: WorldStateDelta): WorldState {
  const current = normalizeWorldState(worldState);
  const removed = new Set(delta.remove_flags ?? []);
  const flags = current.flags.filter((flag) => !removed.has(flag));
  for (const flag of delta.add_flags ?? []) {
    if (!flags.includes(flag)) flags.push(flag);
  }

  return normalizeWorldState({
    clock_offset_minutes: current.clock_offset_minutes + (delta.clock_offset_minutes ?? 0),
    trains: {
      dispatched_unsafe: current.trains.dispatched_unsafe + (delta.trains?.dispatched_unsafe ?? 0),
      safe_runs: current.trains.safe_runs + (delta.trains?.safe_runs ?? 0),
    },
    battery_pct: current.battery_pct + (delta.battery_pct ?? 0),
    cargo: { ...current.cargo, ...(delta.cargo ?? {}) },
    city_stability: current.city_stability + (delta.city_stability ?? 0),
    nix_influence: current.nix_influence + (delta.nix_influence ?? 0),
    flags,
  });
}

export function worldDeltaForChoice(
  nodeKey: string,
  choiceId: Choice["id"],
  classification: ChoiceClassification,
  misconception?: string,
): WorldStateDelta {
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  const positive = classification === "best" || classification === "partial";
  const wrong = !positive;
  const concept = node.curriculum_concept.toLowerCase();
  const room = node.room_slug;
  const event = worldEventForChoice(nodeKey, choiceId, classification, misconception);
  const delta: WorldStateDelta = {
    event,
    memory: memoryForChoice(nodeKey, classification, misconception),
    city_stability: positive ? (classification === "best" ? 5 : 2) : -6,
    nix_influence: positive ? -1 : 1,
    trains: positive ? { safe_runs: 1 } : { dispatched_unsafe: room.includes("trainstation") ? 1 : 0 },
  };

  if (concept.includes("explore") || concept.includes("input")) {
    delta.clock_offset_minutes = positive ? -1 : 1;
    if (positive) delta.remove_flags = appendUnique(delta.remove_flags, "clocks_split");
    if (wrong) delta.add_flags = appendUnique(delta.add_flags, "clocks_split");
  }

  if (room === "future_market" || misconception?.includes("cargo") || misconception?.includes("evidence")) {
    delta.cargo = positive ? { medicine: "safe", glass: "safe" } : { medicine: "at_risk", glass: "at_risk" };
  }

  if (room === "future_reactorcore" || concept.includes("loop")) {
    delta.battery_pct = positive ? 14 : -10;
    if (positive) delta.remove_flags = appendUnique(delta.remove_flags, "reactor_loop_active");
    if (wrong) delta.add_flags = appendUnique(delta.add_flags, "reactor_loop_active");
  }

  if (room === "1800_signal_telegraph_office" || concept.includes("instruction")) {
    if (positive) delta.remove_flags = appendUnique(delta.remove_flags, "telegraph_ambiguous");
    if (wrong) delta.add_flags = appendUnique(delta.add_flags, "telegraph_ambiguous");
  }

  if (concept.includes("safeguard") || concept.includes("agent") || concept.includes("permission")) {
    delta.add_flags = positive
      ? appendUnique(delta.add_flags, "human_review_ready")
      : appendUnique(delta.add_flags, "unsafe_agent_pressure");
  }

  if (nodeKey === "H1_N24" && positive) {
    delta.clock_offset_minutes = -5;
    delta.city_stability = 10;
    delta.cargo = { medicine: "safe", glass: "safe", heavy: "safe" };
    delta.battery_pct = 18;
    delta.remove_flags = ["clocks_split", "reactor_loop_active", "telegraph_ambiguous", "unsafe_agent_pressure"];
    delta.add_flags = ["mission_minute_restored", "human_review_ready"];
  }

  return delta;
}

export function consequenceForDelta(before: WorldState, after: WorldState, delta: WorldStateDelta) {
  void before;
  void after;
  return delta.event.endsWith(".") ? delta.event : `${delta.event}.`;
}

export function worldStateSummary(worldState: WorldState, event?: string): StateSummary {
  const state = normalizeWorldState(worldState);
  return {
    title: "TimeCity status",
    event,
    meters: [
      {
        id: "clock",
        label: "Clock gap",
        value: state.clock_offset_minutes,
        max: 5,
        text: `${state.clock_offset_minutes} min`,
        tone: state.clock_offset_minutes === 0 ? "safe" : state.clock_offset_minutes > 2 ? "danger" : "warning",
      },
      {
        id: "stability",
        label: "City stability",
        value: state.city_stability,
        max: 100,
        text: `${state.city_stability}%`,
        tone: state.city_stability >= 70 ? "safe" : state.city_stability < 40 ? "danger" : "warning",
      },
      {
        id: "battery",
        label: "Battery",
        value: state.battery_pct,
        max: 100,
        text: `${state.battery_pct}%`,
        tone: state.battery_pct >= 65 ? "safe" : state.battery_pct < 35 ? "danger" : "warning",
      },
      {
        id: "nix",
        label: "Nix",
        value: state.nix_influence,
        max: 10,
        text: `${state.nix_influence}/10`,
        tone: state.nix_influence >= 6 ? "danger" : state.nix_influence >= 3 ? "warning" : "safe",
      },
    ],
    flags: state.flags,
  };
}

export function appendCharacterMemory(memory: string[] | undefined, event?: string) {
  if (!event) return memory ?? [];
  return [...(memory ?? []), event].slice(-MAX_MEMORY);
}

function worldEventForChoice(
  nodeKey: string,
  choiceId: Choice["id"],
  classification: ChoiceClassification,
  misconception?: string,
) {
  if (classification === "best") {
    return BEST_EVENTS_BY_NODE[nodeKey] ?? "A warning light snaps off as your evidence check changes the route board.";
  }
  if (classification === "partial") {
    return PARTIAL_EVENTS_BY_NODE[nodeKey] ?? "Ada catches one useful clue, but the station still needs a tighter reason.";
  }
  if (MISS_EVENTS_BY_NODE[nodeKey]) return MISS_EVENTS_BY_NODE[nodeKey];
  if (misconception?.includes("speed") || misconception?.includes("shortcut")) {
    return "Nix's shortcut flashes, and another signal tries to move too soon.";
  }
  if (misconception?.includes("evidence") || misconception?.includes("input")) {
    return "The station reads a noisy clue and the missing minute jitters wider.";
  }
  return `Choice ${choiceId} makes the city show a new warning instead of a safe route.`;
}

const BEST_EVENTS_BY_NODE: Record<string, string> = {
  H1_N01: "COG-9 pulls his metal hand back from DISPATCH and lines up the three time clues.",
  H1_N02: "The route board stops arguing and highlights the three time inputs in blue.",
  H1_N03: "Nix's glowing button sputters when you ask what could go wrong first.",
  H1_N04: "A cargo scanner stamps the medicine, glass, and heavy crates with route warnings.",
  H1_N05: "COG-9 drags the route command into the output box and the cargo facts stay as inputs.",
  H1_N06: "The Data Slate clicks shut with clean cargo and battery readings inside.",
  H1_N07: "The charger loop hears a stop condition and the battery climbs without overheating.",
  H1_N08: "The Debug Wrench exposes the repeat rule and circles the missing battery check.",
  H1_N09: "The 1888 worker nods because the instruction now has an order he can follow.",
  H1_N10: "The telegraph prints a sharper order, and the old route board stops flickering.",
  H1_N11: "The mayor grumbles, but the route board keeps cargo and power beside speed.",
  H1_N12: "The Safety Seal locks over the live timetable switch until a human approves.",
  H1_N13: "The blueprint frame holds: goal, inputs, tools, rules, safety, feedback.",
  H1_N14: "The lab simulator sends fragile cargo to the backup track before Nix can object.",
  H1_N15: "COG-9 waits for the test train report instead of trusting a shiny score.",
  H1_N16: "The blueprint refuses to wake up until the human-check guardrail is attached.",
  H1_N17: "The permissions panel turns from red to blue: read data, suggest route, do not rewrite.",
  H1_N18: "The agent memory stores the route and the result together like a tiny case file.",
  H1_N19: "The mayor hears the quieter cargo alarms and stops pointing only at the loudest queue.",
  H1_N20: "Nix's finger misses the city-wide switch as the test is boxed into one route.",
  H1_N21: "The glass cargo replay freezes on the exact track where expected and actual split.",
  H1_N22: "The revised rule reroutes the fragile train before the sharp turn.",
  H1_N23: "COG-9 stamps the rule because your explanation checks cargo and power before speed.",
  H1_N24: "The station clocks click together and the missing minute drops back into TimeCity.",
};

const PARTIAL_EVENTS_BY_NODE: Record<string, string> = {
  H1_N05: "COG-9 spots one input, but the output box still flashes for a final decision.",
};

const MISS_EVENTS_BY_NODE: Record<string, string> = {
  H1_N01: "The green sign wins for a second; a test train lurches forward while the main clock still disagrees.",
  H1_N02: "COG-9 feeds in one noisy clue and the missing minute jitters across the route board.",
  H1_N03: "Nix slaps the DISPATCH light and a warning horn blares before Ada blocks the switch.",
  H1_N04: "A crate scanner reads the wrong record and the glass cargo warning starts flashing.",
  H1_N05: "COG-9 puts a warning note in the output box, then freezes because it is not a route.",
  H1_N06: "The cargo readings scatter across the platform instead of landing in one clean record.",
  H1_N07: "The charger repeats again and the battery needle jerks toward the red line.",
  H1_N08: "The Debug Wrench chases the wrong panel while the loop keeps tapping power.",
  H1_N09: "The 1888 worker grabs the route lever too early and the old signal bell clanks.",
  H1_N10: "Two telegraph clerks read the vague order differently and reach for different switches.",
  H1_N11: "Nix cheers as the fastest-route sign covers a cargo warning.",
  H1_N12: "The live timetable switch unlocks too much power and Ada snaps the cover shut.",
  H1_N13: "The blueprint buckles where the missing guardrail should hold it together.",
  H1_N14: "The simulator sends fragile cargo into the fast turn and the glass alarm screams.",
  H1_N15: "COG-9 trusts the wrong feedback and nearly misses a damaged cargo report.",
  H1_N16: "The blueprint wakes up too early and Ada has to pull the power cable.",
  H1_N17: "The permissions panel opens a tool the agent should only use with a human nearby.",
  H1_N18: "The memory slot stores a shiny but useless clue and forgets what happened to the train.",
  H1_N19: "The loudest platform gets service while a quiet cargo alarm keeps blinking.",
  H1_N20: "Nix's finger lands on the big switch and Ada slams the test inside a safety box.",
  H1_N21: "The failed glass route is treated as normal and the next replay rattles even harder.",
  H1_N22: "The revised rule still sends fragile cargo toward the risky turn.",
  H1_N23: "COG-9 lifts the stamp, then hesitates because the explanation skipped a key constraint.",
  H1_N24: "The passport page flickers because it describes a speed button, not the agent you built.",
};

function memoryForChoice(nodeKey: string, classification: ChoiceClassification, misconception?: string) {
  if (classification === "best") return `${nodeKey}: chose evidence before action`;
  if (classification === "partial") return `${nodeKey}: found a partial clue`;
  return `${nodeKey}: ${misconception ?? "unsafe choice"} caused a visible warning`;
}

function appendUnique(items: string[] | undefined, item: string) {
  return items?.includes(item) ? items : [...(items ?? []), item];
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
