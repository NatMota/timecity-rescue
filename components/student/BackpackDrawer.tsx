import { Compass, PackageOpen } from "lucide-react";

export function BackpackDrawer({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <aside className="backpack">
      <button type="button" className="tool-button" onClick={onToggle}>
        <PackageOpen size={18} />
        Backpack
      </button>
      {open ? (
        <div className="backpack-panel">
          <div className="backpack-item">
            <Compass size={28} />
            <div>
              <strong>Mission Compass</strong>
              <span>Finds goal, input, rule and output.</span>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
