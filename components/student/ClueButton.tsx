import { Lightbulb, RotateCcw } from "lucide-react";

export function ClueButton({
  clue,
  readAgain,
  readAgainLabel = "Read Again",
  clueLabel = "Ask for Clue",
  fallbackText = "Use a support button if you want a safer next step.",
  onClue,
  onReadAgain,
}: {
  clue?: string;
  readAgain?: string;
  readAgainLabel?: string;
  clueLabel?: string;
  fallbackText?: string;
  onClue: () => void;
  onReadAgain: () => void;
}) {
  return (
    <div className="support-actions">
      <button type="button" className="tool-button" onClick={onReadAgain}>
        <RotateCcw size={18} />
        {readAgainLabel}
      </button>
      <button type="button" className="tool-button" onClick={onClue}>
        <Lightbulb size={18} />
        {clueLabel}
      </button>
      <p>{clue || readAgain || fallbackText}</p>
    </div>
  );
}
