import type { Language } from "@/lib/game/types";

export function LanguageToggle({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <div className="segmented" aria-label="Language">
      <button type="button" aria-pressed={language === "en"} onClick={() => onChange("en")}>
        English
      </button>
      <button type="button" aria-pressed={language === "zh"} onClick={() => onChange("zh")}>
        中文
      </button>
    </div>
  );
}
