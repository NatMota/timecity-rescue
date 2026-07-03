import { Compass, PackageOpen } from "lucide-react";

export function BackpackDrawer({
  open,
  onToggle,
  labels = {
    button: "Backpack",
    item: "Mission Compass",
    description: "Finds goal, input, rule and output.",
  },
}: {
  open: boolean;
  onToggle: () => void;
  labels?: {
    button: string;
    item: string;
    description: string;
  };
}) {
  return (
    <aside className="backpack">
      <button type="button" className="tool-button" onClick={onToggle}>
        <PackageOpen size={18} />
        {labels.button}
      </button>
      {open ? (
        <div className="backpack-panel">
          <div className="backpack-item">
            <Compass size={28} />
            <div>
              <strong>{labels.item}</strong>
              <span>{labels.description}</span>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
