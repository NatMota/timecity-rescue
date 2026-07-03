import clsx from "clsx";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { SideQuest } from "@/lib/game/sideQuests";

export function SideQuestPanel({
  sideQuest,
  complete,
  result,
  disabled,
  onChoose,
}: {
  sideQuest: SideQuest;
  complete: boolean;
  result: { text: string; correct: boolean } | null;
  disabled?: boolean;
  onChoose: (choiceId: string) => void;
}) {
  return (
    <section className={clsx("side-quest-panel", complete && "is-complete")} aria-label={sideQuest.title}>
      <div className="side-quest-heading">
        {complete ? <CheckCircle2 size={20} /> : <Sparkles size={20} />}
        <h2>{sideQuest.title}</h2>
      </div>
      <p>{complete ? sideQuest.success : sideQuest.prompt}</p>
      {!complete ? (
        <div className="side-quest-options">
          {sideQuest.choices.map((choice) => (
            <button key={choice.id} type="button" disabled={disabled} onClick={() => onChoose(choice.id)}>
              <strong>{choice.id}</strong>
              <span>{choice.text}</span>
            </button>
          ))}
        </div>
      ) : null}
      {result && !complete ? <p className={clsx("side-quest-result", result.correct && "is-correct")}>{result.text}</p> : null}
    </section>
  );
}
