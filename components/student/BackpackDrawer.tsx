import { Compass, FileText, PackageOpen, PenTool, ShieldCheck, Wrench } from "lucide-react";

const defaultItems = [
  { slug: "logic_lens", item: "Logic Lens", description: "Reveals hidden rules.", Icon: Compass },
  { slug: "data_slate", item: "Data Slate", description: "Stores clean inputs and outputs.", Icon: FileText },
  { slug: "debug_wrench", item: "Debug Wrench", description: "Inspects loops and broken rules.", Icon: Wrench },
  { slug: "prompt_card", item: "Prompt Card", description: "Makes instructions clearer.", Icon: PenTool },
  { slug: "agent_blueprint", item: "Agent Blueprint", description: "Assembles the final helper agent.", Icon: Compass },
  { slug: "safety_seal", item: "Safety Seal", description: "Adds a human-check guardrail.", Icon: ShieldCheck },
];

export function BackpackDrawer({
  open,
  onToggle,
  labels = {
    button: "Backpack",
    items: defaultItems,
  },
}: {
  open: boolean;
  onToggle: () => void;
  labels?: {
    button: string;
    items?: Array<{
      slug: string;
      item: string;
      description: string;
    }>;
  };
}) {
  const items = labels.items ?? defaultItems;
  return (
    <aside className="backpack">
      <button type="button" className="tool-button" onClick={onToggle}>
        <PackageOpen size={18} />
        {labels.button}
      </button>
      {open ? (
        <div className="backpack-panel">
          {items.map((item) => {
            const fallback = defaultItems.find((candidate) => candidate.slug === item.slug);
            const Icon = fallback?.Icon ?? PackageOpen;
            return (
              <div key={item.slug} className="backpack-item">
                <Icon size={28} />
                <div>
                  <strong>{item.item}</strong>
                  <span>{item.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
