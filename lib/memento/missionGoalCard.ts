import { createMissionGoalCard } from "@/lib/game/demoStore";

export function missionGoalCardHtml(name: string) {
  const card = createMissionGoalCard(name);
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
      dl { display: grid; grid-template-columns: 190px 1fr; gap: 12px 18px; }
      dt { font-weight: 700; }
      dd { margin: 0; }
      button { margin-top: 24px; padding: 12px 18px; border: 0; border-radius: 10px; background: #3654a3; color: white; font-weight: 700; }
      @media print { button { display: none; } body { background: white; } main { border-color: #333; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Agent Builder Passport</h1>
      <h2>${card.chronoCadetName} earned the ${card.badgeEarned}</h2>
      <dl>
        <dt>Mission</dt><dd>${card.mission}</dd>
        <dt>Agent goal</dt><dd>${card.cog9Goal}</dd>
        <dt>Important input</dt><dd>${card.importantInput}</dd>
        <dt>Safe rule</dt><dd>${card.safeRule}</dd>
        <dt>Expected output</dt><dd>${card.expectedOutput}</dd>
        <dt>AI should not</dt><dd>${card.shouldNotDo}</dd>
        <dt>I checked</dt><dd>${card.checkedBeforeActing}</dd>
      </dl>
      <button onclick="window.print()">Print passport</button>
    </main>
  </body>
</html>`;
}
