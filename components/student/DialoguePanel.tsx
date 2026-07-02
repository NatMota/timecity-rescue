import type { ScenePayload } from "@/lib/game/types";

export function DialoguePanel({ scene }: { scene: ScenePayload }) {
  return (
    <section className="dialogue-panel" aria-live="polite">
      <p className="eyebrow">{scene.dialogue.speaker_name}</p>
      <p>{scene.dialogue.text}</p>
    </section>
  );
}
