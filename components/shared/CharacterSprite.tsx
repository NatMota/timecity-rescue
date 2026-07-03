import clsx from "clsx";
import { Bot, GraduationCap, Sparkles } from "lucide-react";
import Image from "next/image";
import { getCharacterImage } from "./characterAssets";
import type { CharacterSlug, CharacterState } from "@/lib/game/types";

const config = {
  ada: { label: "Professor Ada", icon: GraduationCap, tone: "ada" },
  cog9: { label: "COG-9", icon: Bot, tone: "cog" },
  nix: { label: "Nix", icon: Sparkles, tone: "nix" },
};

export function CharacterSprite({ character, state }: { character: CharacterSlug; state: CharacterState }) {
  const item = config[character];
  const Icon = item.icon;
  const image = getCharacterImage(character, state);

  return (
    <div className={clsx("character-card", `character-${item.tone}`)} aria-label={`${item.label}, ${state}`}>
      <div className="character-face">
        {image ? <Image src={image} alt="" fill sizes="86px" className="character-art" /> : <Icon size={46} strokeWidth={2.2} />}
      </div>
      <div>
        <strong>{item.label}</strong>
        <span>{state}</span>
      </div>
    </div>
  );
}
