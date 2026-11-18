import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import firebaseConfig from "../../../../../firebase-applet-config.json";

export const runtime = "nodejs";
export const maxDuration = 30;

async function verifyFirebaseIdToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length < 20) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId?: string }> };
    return data?.users?.[0]?.localId || null;
  } catch {
    return null;
  }
}

const VALID_PITCH_REGISTERS = new Set(["very-low", "low", "medium", "high", "very-high"]);
const VALID_TONES = new Set(["story", "speech", "professional", "podcast", "dramatic", "neutral"]);
const VALID_VOICE_IDS = new Set(["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"]);
const VALID_GEMINI_VOICES = new Set(["Kore", "Zephyr", "Puck", "Charon", "Fenrir"]);

export async function POST(req: NextRequest) {
  try {
    const authenticatedUid = await verifyFirebaseIdToken(req.headers.get("authorization"));
    if (!authenticatedUid) {
      return NextResponse.json(
        { error: "Authentication required to analyze reference audio." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { audioBase64, mimeType = "audio/webm" } = body as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (!audioBase64 || typeof audioBase64 !== "string" || audioBase64.length < 64) {
      return NextResponse.json(
        { error: "Valid reference audio data is required." },
        { status: 400 }
      );
    }

    if (audioBase64.length > 9_000_000) {
      return NextResponse.json(
        { error: "Reference audio sample is too large. Please keep clips under 60 seconds." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, fallback: true, reason: "server_key_unavailable" },
        { status: 200 }
      );
    }

    const cleanMime = typeof mimeType === "string" && mimeType.startsWith("audio/")
      ? mimeType.split(";")[0]
      : "audio/webm";

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: audioBase64,
            },
          },
          {
            text: `Listen ONLY to the speaker's acoustic voice characteristics in this reference sample.
Do NOT transcribe or include any spoken words from the clip anywhere in your JSON output.
Classify:
1. gender: "Male" or "Female"
2. pitchRegister: "very-low", "low", "medium", "high", or "very-high"
3. pitchMultiplier: float between 0.78 (deep bass) and 1.24 (high bright) relative to standard voice pitch (1.0 = neutral)
4. speakingRate: float between 0.80 (slow deliberate) and 1.22 (brisk energetic)
5. toneId: closest delivery style from "story", "speech", "professional", "podcast", "dramatic", "neutral"
6. recommendedVoiceId: choose best match:
   - v1 (Jessica, warm expressive female)
   - v2 (Adam, deep cinematic male)
   - v3 (Clara, poised British-style female)
   - v4 (Marcus, authoritative news/speech male)
   - v5 (Liam, upbeat conversational male)
   - v6 (Zara, graceful multilingual female)
   - v7 (Hamza, rich soulful baritone male)
   - v8 (Nova, bright energetic female)
7. recommendedGeminiVoice: "Charon" (deep resonant), "Fenrir" (bold energetic male), "Puck" (light warm conversational), "Kore" (warm poised female), "Zephyr" (bright clear)
8. voiceStylePrompt: concise 12-25 word acoustic voice design direction describing ONLY timbre, warmth, breath, pitch, rhythm, and emotional tone (zero spoken words from sample)
9. summaryBadge: 3-5 word label like "Deep Calm Male · Measured" or "Warm Bright Female · Expressive"`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gender: { type: Type.STRING },
            pitchRegister: { type: Type.STRING },
            pitchMultiplier: { type: Type.NUMBER },
            speakingRate: { type: Type.NUMBER },
            toneId: { type: Type.STRING },
            recommendedVoiceId: { type: Type.STRING },
            recommendedGeminiVoice: { type: Type.STRING },
            voiceStylePrompt: { type: Type.STRING },
            summaryBadge: { type: Type.STRING },
          },
          required: [
            "gender",
            "pitchRegister",
            "pitchMultiplier",
            "speakingRate",
            "toneId",
            "recommendedVoiceId",
            "recommendedGeminiVoice",
            "voiceStylePrompt",
            "summaryBadge",
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim()) as Record<string, unknown>;
    const gender: "Male" | "Female" =
      parsed.gender === "Female" ? "Female" : "Male";
    const pitchRegister = VALID_PITCH_REGISTERS.has(String(parsed.pitchRegister))
      ? String(parsed.pitchRegister)
      : "medium";
    const pitchMultiplier = Number(
      Math.max(0.76, Math.min(1.26, Number(parsed.pitchMultiplier) || 1.0)).toFixed(2)
    );
    const speakingRate = Number(
      Math.max(0.78, Math.min(1.24, Number(parsed.speakingRate) || 1.0)).toFixed(2)
    );
    const toneId = VALID_TONES.has(String(parsed.toneId))
      ? String(parsed.toneId)
      : "neutral";
    const recommendedVoiceId = VALID_VOICE_IDS.has(String(parsed.recommendedVoiceId))
      ? String(parsed.recommendedVoiceId)
      : gender === "Female"
      ? "v1"
      : "v2";
    const recommendedGeminiVoice = VALID_GEMINI_VOICES.has(
      String(parsed.recommendedGeminiVoice)
    )
      ? String(parsed.recommendedGeminiVoice)
      : gender === "Female"
      ? "Kore"
      : "Charon";

    const voiceStylePrompt =
      typeof parsed.voiceStylePrompt === "string" && parsed.voiceStylePrompt.trim()
        ? parsed.voiceStylePrompt.trim().slice(0, 240)
        : gender === "Female"
        ? "Warm expressive female timbre, natural studio breathing, clear measured phrasing"
        : "Grounded resonant male voice, warm chest tone, steady measured pacing";

    const summaryBadge =
      typeof parsed.summaryBadge === "string" && parsed.summaryBadge.trim()
        ? parsed.summaryBadge.trim().slice(0, 60)
        : `${gender} · ${pitchRegister} register`;

    return NextResponse.json({
      success: true,
      profile: {
        gender,
        pitchRegister,
        pitchMultiplier,
        speakingRate,
        toneId,
        recommendedVoiceId,
        recommendedGeminiVoice,
        voiceStylePrompt,
        summaryBadge,
      },
    });
  } catch (err) {
    console.warn("Analyze reference audio fallback:", err);
    return NextResponse.json(
      { success: false, fallback: true },
      { status: 200 }
    );
  }
}
