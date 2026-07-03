import clsx from "clsx";
import { Bot, GraduationCap, Sparkles } from "lucide-react";
import Image from "next/image";
import { characterLabels, getCharacterImage } from "./characterAssets";
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
}: {
  character: CharacterSlug;
  state: CharacterState;
  phase: CharacterPlaybackPhase;
}) {
  const Icon = icons[character];
  const image = getCharacterImage(character, state, true);

  return (
    <div className={clsx("scene-character", `scene-character-${character}`, `scene-character-${phase}`)} aria-label={characterLabels[character]}>
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
