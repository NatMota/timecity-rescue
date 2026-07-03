import type { MissionGoalCard } from "@/lib/game/types";

export function missionGoalCardHtml(card: MissionGoalCard) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${card.chronoCadetName} - Agent Builder Passport</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f7fb; color: #102033; padding: 32px; }
      main { max-width: 760px; margin: 0 auto; background: white; border: 3px solid #33a6a6; border-radius: 18px; padding: 32px; }
      h1 { margin: 0 0 8px; font-size: 34px; }
      h2 { color: #3654a3; margin-top: 0; }
      .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 22px 0; }
      .summary div { border: 1px solid #d8e5f2; border-radius: 12px; background: #f8fbff; padding: 12px; }
      .summary strong { display: block; color: #3654a3; margin-bottom: 6px; }
      dl { display: grid; grid-template-columns: 190px 1fr; gap: 12px 18px; }
      dt { font-weight: 700; }
      dd { margin: 0; }
      ul { margin: 0; padding-left: 20px; }
      button { margin-top: 24px; padding: 12px 18px; border: 0; border-radius: 10px; background: #3654a3; color: white; font-weight: 700; }
      @media print { button { display: none; } body { background: white; } main { border-color: #333; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Agent Builder Passport</h1>
      <h2>${escapeHtml(card.chronoCadetName)} earned the ${escapeHtml(card.badgeEarned)}</h2>
      <section class="summary" aria-label="Mission summary">
        <div><strong>Avatar</strong>${escapeHtml(card.avatarColor)}</div>
        <div><strong>I fixed</strong>${escapeHtml(card.fixedStatement)}</div>
        <div><strong>I learned</strong>${escapeHtml(card.learnedStatement)}</div>
        <div><strong>Next mission</strong>${escapeHtml(card.nextMissionTeaser)}</div>
      </section>
      <dl>
        <dt>Mission</dt><dd>${escapeHtml(card.mission)}</dd>
        <dt>Route taken</dt><dd>${listHtml(card.routeTaken)}</dd>
        <dt>Locations visited</dt><dd>${listHtml(card.cityLocationsVisited)}</dd>
        <dt>Backpack items used</dt><dd>${listHtml(card.backpackItemsUsed)}</dd>
        <dt>Side quests</dt><dd>${listHtml(card.sideQuestsCompleted, "None completed")}</dd>
        <dt>Agent goal</dt><dd>${escapeHtml(card.cog9Goal)}</dd>
        <dt>Important input</dt><dd>${escapeHtml(card.importantInput)}</dd>
        <dt>Safe rule</dt><dd>${escapeHtml(card.safeRule)}</dd>
        <dt>Expected output</dt><dd>${escapeHtml(card.expectedOutput)}</dd>
        <dt>AI should not</dt><dd>${escapeHtml(card.shouldNotDo)}</dd>
        <dt>I checked</dt><dd>${escapeHtml(card.checkedBeforeActing)}</dd>
      </dl>
      <button onclick="window.print()">Print passport</button>
    </main>
  </body>
</html>`;
}

function listHtml(items: string[], emptyText = "Not recorded") {
  if (!items.length) return escapeHtml(emptyText);
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
