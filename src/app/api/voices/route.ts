import { NextResponse } from "next/server";
import { getCachedGlobalVoices } from "@/lib/audio/globalVoices";

export const runtime = "nodejs";

export async function GET() {
  try {
    const voices = await getCachedGlobalVoices();
    const localesMap = new Map<string, string>();
    for (const v of voices) {
      if (!localesMap.has(v.locale)) {
        localesMap.set(v.locale, v.localeName);
      }
    }

    const locales = Array.from(localesMap.entries())
      .map(([locale, localeName]) => ({ locale, localeName }))
      .sort((a, b) => a.localeName.localeCompare(b.localeName));

    return NextResponse.json(
      {
        success: true,
        voiceCount: voices.length,
        localeCount: locales.length,
        locales,
        voices,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("Failed to fetch global voices:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Could not load voice directory",
        voices: [],
        locales: [],
      },
      { status: 500 }
    );
  }
}
