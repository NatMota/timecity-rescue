import { Award } from "lucide-react";

export function BadgeRibbon({ progress }: { progress: number }) {
  return (
    <div className="badge-ribbon" aria-label={`Agent Badge progress ${progress}%`}>
      <Award size={18} />
      <span>Agent Badge</span>
      <strong>{progress}%</strong>
    </div>
  );
}
