import clsx from "clsx";
import { Bot, GraduationCap, Sparkles } from "lucide-react";
import Image from "next/image";
import { characterLabels, getCharacterImage, type CharacterEra } from "./characterAssets";
import type { CharacterSlug, CharacterState } from "@/lib/game/types";

const icons = {
  ada: GraduationCap,
  cog9: Bot,
  nix: Sparkles,
};

export type CharacterPlaybackPhase = "entering" | "speaking" | "exiting" | "hidden";

export function SceneCharacterLayer({
  character,
  state,
  phase,
  roomSlug,
}: {
  character: CharacterSlug;
  state: CharacterState;
  phase: CharacterPlaybackPhase;
  roomSlug?: string;
}) {
  const Icon = icons[character];
  const era: CharacterEra = roomSlug?.startsWith("1800_") ? "1800" : "future";
  const image = getCharacterImage(character, state, { cutout: true, era });

  return (
    <div
      className={clsx("scene-character", `scene-character-${character}`, `scene-character-${phase}`, `scene-character-era-${era}`)}
      aria-label={characterLabels[character]}
    >
      {image ? (
        <Image src={image} alt="" fill sizes="(max-width: 900px) 45vw, 360px" className="scene-character-art" priority />
      ) : (
        <div className="scene-character-fallback">
          <Icon size={80} strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}
