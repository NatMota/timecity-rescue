export type RoomExplorationQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type RoomExploration = {
  title: string;
  starter: string;
  readyLabel: string;
  minQuestionsBeforeChallenge?: number;
  questions: RoomExplorationQuestion[];
};

export const ROOM_INTRO_NODE_KEYS = ["H1_N01", "H1_N04", "H1_N07", "H1_N09", "H1_N10", "H1_N11", "H1_N13"] as const;

export function isRoomIntroNode(nodeKey: string) {
  return ROOM_INTRO_NODE_KEYS.includes(nodeKey as (typeof ROOM_INTRO_NODE_KEYS)[number]);
}

export function getRoomExploration(nodeKey: string): RoomExploration | null {
  return ROOM_EXPLORATION_BY_NODE[nodeKey] ?? null;
}

const ROOM_EXPLORATION_BY_NODE: Record<string, RoomExploration> = {
  H1_N01: {
    title: "Station clue check",
    starter: "Three station displays are arguing. Tap a clue before touching the controls.",
    readyLabel: "Try the station challenge",
    minQuestionsBeforeChallenge: 1,
    questions: [
      {
        id: "station-clues",
        question: "Check the platform sign",
        answer:
          "The sign is bright green and says GO at 08:05. COG-9 trusts it because it is the newest signal.",
      },
      {
        id: "cog9-role",
        question: "Check the main clock",
        answer:
          "The old clock ticks loudly at 08:04. Ada taps the glass and says it has not skipped before.",
      },
      {
        id: "rush-risk",
        question: "Check the dispatch log",
        answer:
          "The log already lists three departures. COG-9 whispers: 'I sent them when the green sign blinked.'",
      },
    ],
  },
  H1_N04: {
    title: "Market cargo check",
    starter: "The market platform is noisy. Find which clue a route robot could actually use.",
    readyLabel: "Try the cargo challenge",
    minQuestionsBeforeChallenge: 1,
    questions: [
      {
        id: "cargo-stakes",
        question: "Open the blue crate record",
        answer:
          "Frozen medicine. The label says it warms up if the route waits too long.",
      },
      {
        id: "record-source",
        question: "Scan the glass crate",
        answer:
          "Glass panels. The scanner adds a tiny crack icon beside sharp turns.",
      },
      {
        id: "route-risk",
        question: "Read the crowd board",
        answer:
          "Passenger queues are growing. Nix likes this board because it makes speed feel urgent.",
      },
    ],
  },
  H1_N07: {
    title: "Reactor loop check",
    starter: "The charger keeps chanting the same command. Find what it can and cannot see.",
    readyLabel: "Try the loop challenge",
    minQuestionsBeforeChallenge: 1,
    questions: [
      {
        id: "loop-sound",
        question: "Touch the command panel",
        answer:
          "The panel prints SEND POWER, then prints SEND POWER again before COG-9 can blink.",
      },
      {
        id: "battery-state",
        question: "Check the battery needle",
        answer:
          "The needle is climbing. It is not in the red yet, but it is moving faster than Ada likes.",
      },
      {
        id: "loop-risk",
        question: "Ask COG-9 what he hears",
        answer:
          "COG-9 counts each repeat out loud. He gets to eleven and starts looking worried.",
      },
    ],
  },
  H1_N09: {
    title: "1888 platform check",
    starter: "The missing minute has pulled the team into 1888. The old station has no smart screens, so the worker needs steps that can be followed in order.",
    readyLabel: "Try the sequence challenge",
    minQuestionsBeforeChallenge: 1,
    questions: [
      {
        id: "old-station",
        question: "Why are we in 1888?",
        answer:
          "The time signal folded through an old station record. If the 1888 route is fixed, the broken minute has a path back to the future.",
      },
      {
        id: "worker-tools",
        question: "What tools do they have?",
        answer:
          "They have a clock, a route board, and a telegraph message. They do not have COG-9's sensors.",
      },
      {
        id: "order-risk",
        question: "Watch the route lever",
        answer:
          "The lever is heavy. Once the worker pulls it, the signal bell answers before anyone can undo it.",
      },
    ],
  },
  H1_N10: {
    title: "Telegraph wording check",
    starter: "The telegraph message is too vague. Find the missing pieces.",
    readyLabel: "Try the prompt challenge",
    minQuestionsBeforeChallenge: 1,
    questions: [
      {
        id: "message",
        question: "Read the tape",
        answer:
          "The tape only says: 'Send train soon.' The clerk frowns and asks, 'Which train?'",
      },
      {
        id: "receiver",
        question: "Who will read it?",
        answer:
          "A station worker who has seconds to decide. Clear words matter more than clever words.",
      },
      {
        id: "bad-prompt-risk",
        question: "Check the second clerk",
        answer:
          "The second clerk points at a different track. Both clerks think they are following the message.",
      },
    ],
  },
  H1_N11: {
    title: "Mayor's pressure check",
    starter: "The mayor wants trains moving now. Listen for what his speed plan ignores.",
    readyLabel: "Try the trade-off challenge",
    minQuestionsBeforeChallenge: 1,
    questions: [
      {
        id: "mayor-ask",
        question: "Listen to the mayor",
        answer:
          "He points at the crowd and says the city will forgive anything if the next train is fast.",
      },
      {
        id: "constraints",
        question: "Check the route board",
        answer:
          "Power, cargo, and crowd lights sit beside the speed line. One of them keeps blinking amber.",
      },
      {
        id: "agent-plan",
        question: "Inspect Ada's plan",
        answer:
          "A Station Helper Agent: a bounded helper that reads evidence and recommends a route for a human to approve.",
      },
    ],
  },
  H1_N13: {
    title: "Agent lab build check",
    starter: "The lab doors open. The agent parts are scattered like puzzle pieces.",
    readyLabel: "Try the build challenge",
    minQuestionsBeforeChallenge: 1,
    questions: [
      {
        id: "bench",
        question: "Look at the workbench",
        answer:
          "Six parts are loose: a goal card, data slate, rule board, tool panel, safety seal, and feedback meter.",
      },
      {
        id: "agent-risk",
        question: "Watch Nix",
        answer:
          "Nix tries to stick a SPEED sticker over two parts before Ada catches his wrist.",
      },
      {
        id: "win-state",
        question: "Ask COG-9 what he wants",
        answer:
          "COG-9 says, 'I want to help without accidentally becoming the problem.'",
      },
    ],
  },
};
