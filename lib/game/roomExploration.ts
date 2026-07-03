export type RoomExplorationQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type RoomExploration = {
  title: string;
  starter: string;
  readyLabel: string;
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
    starter: "Pick a question to inspect the station before touching the controls.",
    readyLabel: "Try the station challenge",
    questions: [
      {
        id: "station-clues",
        question: "Show me the clues",
        answer:
          "The platform sign is green, the main clock is one minute behind it, and the dispatch log says three trains already left.",
      },
      {
        id: "cog9-role",
        question: "Who is COG-9?",
        answer:
          "COG-9 is the station helper robot. He reads station signals and suggests train movements, but he needs checked evidence first.",
      },
      {
        id: "rush-risk",
        question: "What happens if we rush?",
        answer:
          "Another train could leave on the wrong minute before anyone checks power, cargo, and passenger safety.",
      },
    ],
  },
  H1_N04: {
    title: "Market cargo check",
    starter: "Inspect the cargo records before the next train leaves.",
    readyLabel: "Try the cargo challenge",
    questions: [
      {
        id: "cargo-stakes",
        question: "What is on the train?",
        answer:
          "One carriage has frozen medicine, one has glass panels, and one has heavy repair parts. They cannot all use the same route.",
      },
      {
        id: "record-source",
        question: "Who made the records?",
        answer:
          "Market loaders scanned each crate as it crossed the platform gate. Some nearby signs are just adverts.",
      },
      {
        id: "route-risk",
        question: "What could go wrong?",
        answer:
          "A sharp turn could break glass, a slow platform could warm medicine, and a weak track could fail under heavy cargo.",
      },
    ],
  },
  H1_N07: {
    title: "Reactor loop check",
    starter: "The charger is repeating. Inspect the loop before adding more power.",
    readyLabel: "Try the loop challenge",
    questions: [
      {
        id: "loop-sound",
        question: "What is repeating?",
        answer:
          "The charger keeps sending a small burst of power, then immediately starts the same command again.",
      },
      {
        id: "battery-state",
        question: "What does the battery show?",
        answer:
          "The station battery is climbing, but the charger does not look at the battery before repeating.",
      },
      {
        id: "loop-risk",
        question: "Why is that risky?",
        answer:
          "A loop with no stop check can waste power or overcharge the station while everyone watches the train board.",
      },
    ],
  },
  H1_N09: {
    title: "1888 platform check",
    starter: "The old station has no smart screens. Check what a human worker can follow.",
    readyLabel: "Try the sequence challenge",
    questions: [
      {
        id: "old-station",
        question: "Why are we in 1888?",
        answer:
          "The missing minute has pulled an old station into the signal. Its workers need instructions they can follow in order.",
      },
      {
        id: "worker-tools",
        question: "What tools do they have?",
        answer:
          "They have a clock, a route board, and a telegraph message. They do not have COG-9's sensors.",
      },
      {
        id: "order-risk",
        question: "Why does order matter?",
        answer:
          "If someone chooses the track before checking the signal, the train can leave before the route is safe.",
      },
    ],
  },
  H1_N10: {
    title: "Telegraph wording check",
    starter: "The telegraph message is too vague. Inspect what is missing.",
    readyLabel: "Try the prompt challenge",
    questions: [
      {
        id: "message",
        question: "What does the message say?",
        answer:
          "It only says 'Send train soon.' Nobody can tell which train, which track, or what safety check comes first.",
      },
      {
        id: "receiver",
        question: "Who will read it?",
        answer:
          "A station worker who has seconds to decide. Clear words matter more than clever words.",
      },
      {
        id: "bad-prompt-risk",
        question: "What could go wrong?",
        answer:
          "A vague instruction can make two people do different things while both believe they followed the order.",
      },
    ],
  },
  H1_N11: {
    title: "Mayor's pressure check",
    starter: "The mayor wants trains moving again. Inspect the trade-off before promising speed.",
    readyLabel: "Try the trade-off challenge",
    questions: [
      {
        id: "mayor-ask",
        question: "What does the mayor want?",
        answer:
          "Passengers are angry, so the mayor wants the fastest route. Ada is worried speed alone will hide the broken rule.",
      },
      {
        id: "constraints",
        question: "What can stop a fast route?",
        answer:
          "Low power, fragile cargo, crowded platforms, and a timetable change can all make the fastest route unsafe.",
      },
      {
        id: "agent-plan",
        question: "What are we building?",
        answer:
          "A Station Helper Agent: a bounded helper that reads evidence and recommends a route for a human to approve.",
      },
    ],
  },
  H1_N13: {
    title: "Agent lab build check",
    starter: "The lab doors open. Inspect the parts before building the helper agent.",
    readyLabel: "Try the build challenge",
    questions: [
      {
        id: "bench",
        question: "What is on the workbench?",
        answer:
          "There is a goal card, data slate, rule board, tool permissions panel, safety seal, and feedback meter.",
      },
      {
        id: "agent-risk",
        question: "What could go wrong?",
        answer:
          "An agent with a goal but no guardrail could chase speed and change the timetable without a human check.",
      },
      {
        id: "win-state",
        question: "How do we restore the minute?",
        answer:
          "Build a helper that checks the right evidence, explains its route, and waits before changing the city.",
      },
    ],
  },
};
