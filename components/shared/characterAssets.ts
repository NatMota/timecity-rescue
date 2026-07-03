import type { CharacterSlug, CharacterState } from "@/lib/game/types";

export const characterLabels: Record<CharacterSlug, string> = {
  ada: "Professor Ada",
  cog9: "COG-9",
  nix: "Nix",
};

export function getCharacterImage(character: CharacterSlug, state: CharacterState, cutout = false) {
  const prefix = cutout ? "/assets/characters/cutouts" : "/assets/characters";
  if (character === "ada") {
    return state === "thinking" || state === "uncertain"
      ? `${prefix}/ada-future-thinking.png`
      : `${prefix}/ada-future-neutral.png`;
  }
  if (character === "cog9") {
    return state === "warning" || state === "uncertain"
      ? `${prefix}/cog9-future-worried.png`
      : `${prefix}/cog9-future-neutral.png`;
  }
  if (character === "nix") {
    return state === "caught" ? `${prefix}/nix-future-caught.png` : `${prefix}/nix-future-tempting.png`;
  }
  return null;
}
