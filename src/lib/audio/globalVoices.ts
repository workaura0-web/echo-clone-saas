import { MsEdgeTTS } from "msedge-tts";

export interface GlobalNeuralVoice {
  shortName: string;
  displayName: string;
  gender: "Male" | "Female";
  locale: string;
  localeName: string;
  personalities: string[];
  categories: string[];
}

const EXCLUDED_VOICES = new Set([
  "en-US-AndrewMultilingualNeural",
  "ur-PK-UzmaNeural",
  "ur-PK-AsadNeural",
]);

let cachedVoices: GlobalNeuralVoice[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function formatShortVoiceName(shortName: string): string {
  const parts = shortName.split("-");
  const raw = parts[parts.length - 1] || shortName;
  return raw
    .replace(/MultilingualNeural$/i, " (Multilingual)")
    .replace(/Neural$/i, "");
}

function formatLocaleName(locale: string, rawLocaleName?: string): string {
  if (rawLocaleName && rawLocaleName.trim()) {
    return rawLocaleName.trim();
  }
  try {
    const [lang, region] = locale.split("-");
    const langNames = new Intl.DisplayNames(["en"], { type: "language" });
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    const langLabel = lang ? langNames.of(lang) : locale;
    const regionLabel = region ? regionNames.of(region) : "";
    if (langLabel && regionLabel) return `${langLabel} (${regionLabel})`;
    if (langLabel) return langLabel;
  } catch {
    // Fallback to raw locale code
  }
  return locale;
}

export async function getCachedGlobalVoices(): Promise<GlobalNeuralVoice[]> {
  if (cachedVoices && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedVoices;
  }

  const tts = new MsEdgeTTS();
  const rawList = await tts.getVoices();

  const cleaned: GlobalNeuralVoice[] = (Array.isArray(rawList) ? rawList : [])
    .filter((v) => v?.ShortName && !EXCLUDED_VOICES.has(v.ShortName))
    .map((v) => {
      const rawObj = v as unknown as Record<string, unknown>;
      const locale = String(v.Locale || "en-US");
      const rawLocaleName =
        typeof rawObj.LocaleName === "string" ? rawObj.LocaleName : undefined;

      const rawTag = (rawObj.VoiceTag as Record<string, unknown> | undefined) || {};
      const personalities = Array.isArray(rawTag.VoicePersonalities)
        ? (rawTag.VoicePersonalities as string[])
        : [];
      const categories = Array.isArray(rawTag.ContentCategories)
        ? (rawTag.ContentCategories as string[])
        : [];

      return {
        shortName: v.ShortName,
        displayName: formatShortVoiceName(v.ShortName),
        gender: (v.Gender === "Male" ? "Male" : "Female") as "Male" | "Female",
        locale,
        localeName: formatLocaleName(locale, rawLocaleName),
        personalities,
        categories,
      };
    })
    .sort((a, b) => {
      const locCmp = a.localeName.localeCompare(b.localeName);
      return locCmp !== 0 ? locCmp : a.displayName.localeCompare(b.displayName);
    });

  cachedVoices = cleaned;
  cachedAt = Date.now();
  return cleaned;
}
