import type { CharacterSlug, CharacterState } from "@/lib/game/types";

export type CharacterEra = "future" | "1800";

export const characterLabels: Record<CharacterSlug, string> = {
  ada: "Professor Ada",
  cog9: "COG-9",
  nix: "Nix",
};

export function getCharacterImage(
  character: CharacterSlug,
  state: CharacterState,
  options: { cutout?: boolean; era?: CharacterEra } = {},
) {
  const era = options.era ?? "future";
  const cutout = Boolean(options.cutout);
  const prefix = cutout ? "/assets/characters/cutouts" : "/assets/characters";
  if (character === "ada") {
    return state === "thinking" || state === "uncertain"
      ? `${prefix}/ada-${era}-thinking.png`
      : `${prefix}/ada-${era}-neutral.png`;
  }
  if (character === "cog9") {
    return state === "warning" || state === "uncertain"
      ? `${prefix}/cog9-${era}-worried.png`
      : `${prefix}/cog9-${era}-neutral.png`;
  }
  if (character === "nix") {
    return state === "caught" ? `${prefix}/nix-${era}-caught.png` : `${prefix}/nix-${era}-tempting.png`;
  }
  return null;
}
