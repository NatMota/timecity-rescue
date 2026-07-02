import { Lightbulb, RotateCcw } from "lucide-react";

export function ClueButton({
  clue,
  readAgain,
  onClue,
  onReadAgain,
}: {
  clue?: string;
  readAgain?: string;
  onClue: () => void;
  onReadAgain: () => void;
}) {
  return (
    <div className="support-actions">
      <button type="button" className="tool-button" onClick={onReadAgain}>
        <RotateCcw size={18} />
        Read Again
      </button>
      <button type="button" className="tool-button" onClick={onClue}>
        <Lightbulb size={18} />
        Ask for Clue
      </button>
      <p>{clue || readAgain || "Use a support button if you want a safer next step."}</p>
    </div>
  );
}
