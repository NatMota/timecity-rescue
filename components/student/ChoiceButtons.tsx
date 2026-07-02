import type { Choice } from "@/lib/game/types";

export function ChoiceButtons({
  choices,
  disabled,
  onChoose,
}: {
  choices: Choice[];
  disabled?: boolean;
  onChoose: (choiceId: string) => void;
}) {
  return (
    <div className="choice-grid" role="group" aria-label="Story choices">
      {choices.map((choice) => (
        <button key={choice.id} type="button" className="choice-button" disabled={disabled} onClick={() => onChoose(choice.id)}>
          <strong>{choice.id}</strong>
          <span>{choice.text}</span>
        </button>
      ))}
    </div>
  );
}
