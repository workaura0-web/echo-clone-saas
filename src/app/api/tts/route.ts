import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { Mp3Encoder } from "@breezystack/lamejs";
import {
  COUNTRY_ACCENTS,
  DELIVERY_TONES,
  detectLanguageLocale,
  EMOTION_PROFILES,
  EmotionType,
  GLOBAL_DEMO_LANGUAGES,
  SAMPLE_TEMPLATES,
  VOICES,
  VoicePersona,
} from "@/lib/audio/accentsAndVoices";
import { analyzeScriptEmotionsLocally, AnalyzedSegment } from "@/lib/audio/speechSynth";
import { getCachedGlobalVoices, GlobalNeuralVoice } from "@/lib/audio/globalVoices";
import firebaseConfig from "../../../../firebase-applet-config.json";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_HOMEPAGE_DEMO_TEXTS = new Set<string>(
  [
    SAMPLE_TEMPLATES[0]?.text?.trim(),
    ...GLOBAL_DEMO_LANGUAGES.map((item) => item.sampleText.trim()),
  ].filter((t): t is string => Boolean(t))
);

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

const VALID_EMOTIONS: EmotionType[] = [
  "calm",
  "angry",
  "laughing",
  "humorous",
  "sad",
  "excited",
  "whispering",
];

const URDU_ARABIC_REGEX = /[\u0600-\u06FF]/;

function escapeXmlForSsml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatSignedPercent(delta: number, min = -35, max = 40): string {
  const clamped = Math.round(Math.max(min, Math.min(max, delta)));
  return clamped >= 0 ? `+${clamped}%` : `${clamped}%`;
}

function splitLongTextForEdge(text: string, maxLen = 420): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const parts: string[] = [];
  const sentences = clean.split(/(?<=[.!?।۔\n])\s+/);
  let buf = "";

  for (const s of sentences) {
    if ((buf + " " + s).trim().length <= maxLen) {
      buf = (buf + " " + s).trim();
    } else {
      if (buf) parts.push(buf);
      if (s.length <= maxLen) {
        buf = s;
      } else {
        const words = s.split(/\s+/);
        let wBuf = "";
        for (const w of words) {
          if ((wBuf + " " + w).trim().length <= maxLen) {
            wBuf = (wBuf + " " + w).trim();
          } else {
            if (wBuf) parts.push(wBuf);
            wBuf = w;
          }
        }
        buf = wBuf;
      }
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

function resolveNeuralVoiceForLocale(
  locale: string,
  voice: VoicePersona,
  globalVoices: GlobalNeuralVoice[],
  customEdgeVoice?: string
): string {
  if (customEdgeVoice && /^[a-z]{2,3}-[A-Z]{2,4}-[\w-]+Neural$/i.test(customEdgeVoice)) {
    return customEdgeVoice;
  }

  if (voice.edgeVoicesByAccent[locale]) {
    return voice.edgeVoicesByAccent[locale];
  }

  const normalizedLocale = locale === "en-PK" ? "en-IN" : locale;
  const exactGenderMatch = globalVoices.find(
    (v) => v.locale.toLowerCase() === normalizedLocale.toLowerCase() && v.gender === voice.gender
  );
  if (exactGenderMatch) return exactGenderMatch.shortName;

  const exactLocaleAny = globalVoices.find(
    (v) => v.locale.toLowerCase() === normalizedLocale.toLowerCase()
  );
  if (exactLocaleAny) return exactLocaleAny.shortName;

  const langPrefix = normalizedLocale.split("-")[0]?.toLowerCase() || "en";
  const prefixGenderMatch = globalVoices.find(
    (v) => v.locale.toLowerCase().startsWith(`${langPrefix}-`) && v.gender === voice.gender
  );
  if (prefixGenderMatch) return prefixGenderMatch.shortName;

  const prefixAny = globalVoices.find((v) =>
    v.locale.toLowerCase().startsWith(`${langPrefix}-`)
  );
  if (prefixAny) return prefixAny.shortName;

  return voice.edgeVoicesByAccent["en-US"] || (voice.gender === "Male" ? "en-US-GuyNeural" : "en-US-JennyNeural");
}

async function synthesizeChunkWithRetry(
  tts: MsEdgeTTS,
  escapedText: string,
  prosody: { rate?: string; pitch?: string }
): Promise<Buffer> {
  try {
    const { audioStream } = tts.toStream(escapedText, prosody);
    const parts: Buffer[] = [];
    for await (const chunk of audioStream) {
      parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(parts);
  } catch (err) {
    // Retry once with clean default prosody if a specific locale rejects rate/pitch percentages
    if (prosody.rate || prosody.pitch) {
      const { audioStream } = tts.toStream(escapedText, {});
      const parts: Buffer[] = [];
      for await (const chunk of audioStream) {
        parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(parts);
    }
    throw err;
  }
}

async function synthesizeWithEdgeNeuralMp3(params: {
  segments: AnalyzedSegment[];
  voice: VoicePersona;
  resolvedLocale: string;
  toneId: string;
  speed: number;
  pitch: number;
  isPreview: boolean;
  customEdgeVoice?: string;
  qualitySteps?: number;
  removeSilences?: boolean;
  seed?: number;
}): Promise<{ audioUrl: string; usedVoice: string } | null> {
  const {
    segments,
    voice,
    resolvedLocale,
    toneId,
    speed,
    pitch,
    isPreview,
    customEdgeVoice,
    qualitySteps = 32,
    removeSilences = false,
    seed,
  } = params;

  let globalVoices: GlobalNeuralVoice[] = [];
  if (!customEdgeVoice && !voice.edgeVoicesByAccent[resolvedLocale]) {
    globalVoices = await getCachedGlobalVoices().catch(() => []);
  }

  const defaultEdgeVoice = resolveNeuralVoiceForLocale(
    resolvedLocale,
    voice,
    globalVoices,
    customEdgeVoice
  );

  const outputFormat =
    qualitySteps <= 16
      ? OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
      : OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;

  const speedPctBase = (Number(speed || 1) - 1) * 100;
  const pitchPctBase = (Number(pitch || 1) - 1) * 55;

  // Deterministic seed micro-variation (+/- 2%) when seed is provided
  const seedPitchJitter =
    typeof seed === "number" && Number.isFinite(seed) ? ((seed % 5) - 2) : 0;

  const toneRateOffset =
    toneId === "speech" ? -6 : toneId === "dramatic" ? -8 : toneId === "podcast" ? 3 : 0;
  const tonePitchOffset =
    toneId === "dramatic" ? -5 : toneId === "speech" ? -2 : toneId === "podcast" ? 2 : 0;

  const silenceTightenRate = removeSilences ? 3 : 0;

  const mp3Buffers: Buffer[] = [];
  let activeVoice = "";
  let firstUsedVoice = defaultEdgeVoice;
  let tts: MsEdgeTTS | null = null;

  try {
    for (const seg of segments) {
      const cleanSegText = removeSilences
        ? seg.text.replace(/\s+/g, " ").replace(/\.{2,}/g, ".").trim()
        : seg.text.trim();

      if (!cleanSegText) continue;

      const hasUrduArabicScript = URDU_ARABIC_REGEX.test(cleanSegText);
      const isUrduLocale = resolvedLocale.startsWith("ur");

      let segmentVoice = defaultEdgeVoice;
      if (!customEdgeVoice && hasUrduArabicScript && (isUrduLocale || resolvedLocale === "en-PK" || resolvedLocale === "en-US")) {
        segmentVoice = voice.urduScriptVoice;
      }

      if (!tts || activeVoice !== segmentVoice) {
        if (tts) {
          tts.close();
        }
        tts = new MsEdgeTTS({ connectionTimeoutMs: 12000, synthesisTimeoutMs: 30000 });
        await tts.setMetadata(segmentVoice, outputFormat);
        activeVoice = segmentVoice;
        if (mp3Buffers.length === 0) firstUsedVoice = segmentVoice;
      }

      const emo = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
      const isStoryOrDrama = !isPreview && (toneId === "story" || toneId === "dramatic");
      const emoRate = isStoryOrDrama ? emo.edgeRateDelta : 0;
      const emoPitch = isStoryOrDrama ? emo.edgePitchDelta : 0;

      const isUrduVoice = segmentVoice.startsWith("ur-");
      const rateStr = formatSignedPercent(
        speedPctBase + toneRateOffset + emoRate + silenceTightenRate
      );
      const pitchStr = formatSignedPercent(
        pitchPctBase + tonePitchOffset + emoPitch + seedPitchJitter
      );

      const chunksOfText = splitLongTextForEdge(cleanSegText, 420);
      for (const piece of chunksOfText) {
        const escaped = escapeXmlForSsml(piece);
        const prosody = isUrduVoice ? {} : { rate: rateStr, pitch: pitchStr };
        const buf = await synthesizeChunkWithRetry(tts, escaped, prosody);
        if (buf.length > 0) {
          mp3Buffers.push(buf);
        }
      }
    }

    if (mp3Buffers.length === 0) return null;
    const mergedMp3 = Buffer.concat(mp3Buffers);
    if (mergedMp3.length < 256) return null;

    return {
      audioUrl: `data:audio/mpeg;base64,${mergedMp3.toString("base64")}`,
      usedVoice: firstUsedVoice,
    };
  } catch (err) {
    console.warn("Edge Neural TTS error:", err);
    return null;
  } finally {
    if (tts) {
      tts.close();
    }
  }
}

function wavBase64ToMp3DataUrl(wavBase64: string): string | null {
  try {
    const wavBuf = Buffer.from(wavBase64, "base64");
    if (wavBuf.length <= 44) return null;

    const sampleRate = wavBuf.readUInt32LE(24) || 24000;
    const channels = wavBuf.readUInt16LE(22) || 1;
    const pcmDataOffset = 44;
    const sampleCount = Math.floor((wavBuf.length - pcmDataOffset) / 2);
    const pcmSamples = new Int16Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      pcmSamples[i] = wavBuf.readInt16LE(pcmDataOffset + i * 2);
    }

    const encoder = new Mp3Encoder(channels, sampleRate, 96);
    const mp3Chunks: Uint8Array[] = [];
    const blockSize = 1152;

    for (let i = 0; i < pcmSamples.length; i += blockSize) {
      const slice = pcmSamples.subarray(i, i + blockSize);
      const encoded = encoder.encodeBuffer(slice);
      if (encoded.length > 0) {
        mp3Chunks.push(encoded);
      }
    }
    const flushed = encoder.flush();
    if (flushed.length > 0) {
      mp3Chunks.push(flushed);
    }

    const finalBuf = Buffer.concat(mp3Chunks.map((u) => Buffer.from(u)));
    return `data:audio/mpeg;base64,${finalBuf.toString("base64")}`;
  } catch (err) {
    console.warn("WAV to MP3 conversion warning:", err);
    return null;
  }
}

function extractBase64AudioFromResponse(response: unknown): string | undefined {
  const res = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
        }>;
      };
    }>;
  };

  const parts = res?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return undefined;

  for (const part of parts) {
    if (part?.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      text,
      voiceId = "v1",
      accentId = "en-US",
      toneId = "story",
      speed = 1,
      pitch = 1,
      customSegments,
      customEdgeVoice,
      referenceVoiceProfile,
      qualitySteps = 32,
      removeSilences = false,
      seed,
      isPreview = false,
    } = body as {
      text?: string;
      voiceId?: string;
      accentId?: string;
      toneId?: string;
      speed?: number;
      pitch?: number;
      customSegments?: AnalyzedSegment[];
      customEdgeVoice?: string;
      referenceVoiceProfile?: {
        name?: string;
        gender?: "Male" | "Female";
        pitchMultiplier?: number;
        speakingRate?: number;
        toneId?: string;
        recommendedVoiceId?: string;
        recommendedGeminiVoice?: "Kore" | "Zephyr" | "Puck" | "Charon" | "Fenrir";
        voiceStylePrompt?: string;
      };
      qualitySteps?: number;
      removeSilences?: boolean;
      seed?: number;
      isPreview?: boolean;
    };

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json({ error: "Text script is required." }, { status: 400 });
    }

    const authenticatedUid = await verifyFirebaseIdToken(req.headers.get("authorization"));
    if (!authenticatedUid && !ALLOWED_HOMEPAGE_DEMO_TEXTS.has(text.trim())) {
      return NextResponse.json(
        {
          error:
            "Authentication required. Please create an account or sign in to generate speech in Echo Studio.",
        },
        { status: 401 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: "Single request chunk must be 50,000 characters or fewer." },
        { status: 400 }
      );
    }

    const refVoiceById = referenceVoiceProfile?.recommendedVoiceId
      ? VOICES.find((v) => v.id === referenceVoiceProfile.recommendedVoiceId)
      : undefined;
    const refVoiceByGender = referenceVoiceProfile?.gender
      ? VOICES.find((v) => v.gender === referenceVoiceProfile.gender)
      : undefined;
    const voice =
      (referenceVoiceProfile ? refVoiceById || refVoiceByGender : undefined) ||
      VOICES.find((v) => v.id === voiceId) ||
      VOICES[0];
    const tone = DELIVERY_TONES.find((t) => t.id === toneId) || DELIVERY_TONES[0];

    const effectiveSpeed = Number(
      Math.max(
        0.5,
        Math.min(
          2.0,
          (Number(speed) || 1) *
            (referenceVoiceProfile?.speakingRate
              ? Math.max(0.78, Math.min(1.24, referenceVoiceProfile.speakingRate))
              : 1)
        )
      ).toFixed(2)
    );
    const effectivePitch = Number(
      Math.max(
        0.6,
        Math.min(
          1.4,
          (Number(pitch) || 1) *
            (referenceVoiceProfile?.pitchMultiplier
              ? Math.max(0.76, Math.min(1.26, referenceVoiceProfile.pitchMultiplier))
              : 1)
        )
      ).toFixed(2)
    );

    let resolvedLocale = accentId || "en-US";
    let detectedLabel = COUNTRY_ACCENTS.find((a) => a.id === resolvedLocale)?.label || resolvedLocale;

    if (resolvedLocale === "auto") {
      const detected = detectLanguageLocale(text);
      resolvedLocale = detected.locale;
      detectedLabel = `Auto · ${detected.label}`;
    }

    const wordCount = text.trim().split(/\s+/).length;
    const durationSeconds = Math.max(2, Math.ceil(wordCount / (2.4 * (Number(speed) || 1))));

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    let segments: AnalyzedSegment[] =
      Array.isArray(customSegments) && customSegments.length > 0
        ? customSegments
        : analyzeScriptEmotionsLocally(text, tone.id);

    if (
      apiKey &&
      !isPreview &&
      (!Array.isArray(customSegments) || customSegments.length === 0) &&
      (tone.id === "story" || tone.id === "dramatic")
    ) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });
        const analysisResponse = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Analyze this script sentence by sentence for a voice actor. Classify each sentence's dominant emotion from: calm, angry, laughing, humorous, sad, excited, whispering. Keep the exact original sentence text untouched.\n\nScript:\n${text}`,
          config: {
            systemInstruction:
              "You are an expert voice acting director. Segment the provided script into natural sentences preserving exact wording, and tag each segment with the most fitting emotion (angry for rage/shouting, laughing for laughter/joy, humorous for funny/witty/comedy, sad for grief/sorrow, whispering for hushed/secret, excited for enthusiasm, calm for neutral narrative).",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  emotion: { type: Type.STRING },
                  cue: { type: Type.STRING },
                },
                required: ["text", "emotion"],
              },
            },
          },
        });

        const parsed = JSON.parse((analysisResponse.text ?? "[]").trim());
        if (Array.isArray(parsed) && parsed.length > 0) {
          segments = parsed
            .filter((s) => s && typeof s.text === "string" && s.text.trim().length > 0)
            .map((s) => ({
              text: s.text.trim(),
              emotion: VALID_EMOTIONS.includes(s.emotion as EmotionType)
                ? (s.emotion as EmotionType)
                : "calm",
              cue: typeof s.cue === "string" ? s.cue : undefined,
            }));
        }
      } catch (analysisErr) {
        console.warn("Emotion director fell back to local analyzer:", analysisErr);
      }
    }

    // When user explicitly selected an uploaded/recorded reference voice profile,
    // prefer Gemini Voice Design (gemini-3.8-flash-tts) with the analyzed acoustic style
    // so timbre, pitch, and delivery tone match the reference sample while speaking ONLY `text`.
    if (apiKey && !isPreview && referenceVoiceProfile?.voiceStylePrompt && text.length <= 4500) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });
        const accentObj = COUNTRY_ACCENTS.find((a) => a.id === resolvedLocale);
        const refDirectedScript =
          tone.id === "story" || tone.id === "dramatic"
            ? segments
                .map((seg) => {
                  const profile = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
                  if (seg.emotion === "laughing") return `<laugh> ${seg.text}`;
                  if (seg.emotion === "sad") return `<breath> ${seg.text}`;
                  if (seg.emotion === "whispering") return `<gasp> ${seg.text}`;
                  if (profile.cueTag) return `${profile.cueTag} ${seg.text}`;
                  return seg.text;
                })
                .join(" ")
            : text;

        const pitchHint =
          effectivePitch < 0.92
            ? "Lower deep vocal register."
            : effectivePitch > 1.08
            ? "Elevated brighter vocal register."
            : "Natural mid vocal register.";
        const paceHint =
          effectiveSpeed < 0.92
            ? "Measured unhurried pacing."
            : effectiveSpeed > 1.08
            ? "Crisp energetic pacing."
            : "";

        const refStyleInstruction =
          `${referenceVoiceProfile.voiceStylePrompt}. ${pitchHint} ${paceHint} ${
            accentObj?.styleDirection || `Speak naturally in locale ${resolvedLocale}.`
          } ${tone.styleDirection}`.trim();

        const targetGeminiVoice =
          referenceVoiceProfile.recommendedGeminiVoice || voice.geminiVoice;

        const refTtsResponse = await ai.models.generateContent({
          model: "gemini-3.8-flash-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: refDirectedScript,
                  speechMetadata: { style: refStyleInstruction },
                },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: targetGeminiVoice } },
            },
          },
        });

        const base64Wav = extractBase64AudioFromResponse(refTtsResponse);
        if (base64Wav) {
          const mp3DataUrl = wavBase64ToMp3DataUrl(base64Wav);
          return NextResponse.json({
            success: true,
            engine: mp3DataUrl ? "neural-mp3" : "gemini-tts",
            audioUrl: mp3DataUrl || `data:audio/wav;base64,${base64Wav}`,
            resolvedNeuralVoice: `Reference Clone (${referenceVoiceProfile.gender || voice.gender})`,
            detectedLocale: resolvedLocale,
            accentLabel: detectedLabel,
            segments,
            durationSeconds,
            voiceName: referenceVoiceProfile.name || voice.name,
            gender: referenceVoiceProfile.gender || voice.gender,
            toneLabel: tone.label,
          });
        }
      } catch (refTtsErr) {
        console.warn("Reference Voice Design fell back to calibrated neural voice:", refTtsErr);
      }
    }

    const neuralResult = await synthesizeWithEdgeNeuralMp3({
      segments,
      voice,
      resolvedLocale,
      toneId: tone.id,
      speed: effectiveSpeed,
      pitch: effectivePitch,
      isPreview: Boolean(isPreview),
      customEdgeVoice: referenceVoiceProfile ? undefined : customEdgeVoice,
      qualitySteps: Number(qualitySteps) || 32,
      removeSilences: Boolean(removeSilences),
      seed: typeof seed === "number" ? seed : undefined,
    });

    if (neuralResult) {
      return NextResponse.json({
        success: true,
        engine: "neural-mp3",
        audioUrl: neuralResult.audioUrl,
        resolvedNeuralVoice: referenceVoiceProfile
          ? `${referenceVoiceProfile.name || "Reference"} · ${neuralResult.usedVoice}`
          : neuralResult.usedVoice,
        detectedLocale: resolvedLocale,
        accentLabel: detectedLabel,
        segments,
        durationSeconds,
        voiceName: referenceVoiceProfile?.name
          ? `${referenceVoiceProfile.name} (Matched)`
          : customEdgeVoice
          ? customEdgeVoice.split("-").pop()?.replace(/Neural$/, "") || voice.name
          : voice.name,
        gender: referenceVoiceProfile?.gender || voice.gender,
        toneLabel: tone.label,
      });
    }

    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const directedScript =
        !isPreview && (tone.id === "story" || tone.id === "dramatic")
          ? segments
              .map((seg) => {
                const profile = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
                if (seg.emotion === "laughing") return `<laugh> ${seg.text}`;
                if (seg.emotion === "sad") return `<breath> ${seg.text}`;
                if (seg.emotion === "whispering") return `<gasp> ${seg.text}`;
                if (profile.cueTag) return `${profile.cueTag} ${seg.text}`;
                return seg.text;
              })
              .join(" ")
          : text;

      const accentObj = COUNTRY_ACCENTS.find((a) => a.id === resolvedLocale);
      const styleInstruction = `${
        referenceVoiceProfile?.voiceStylePrompt || voice.voiceDirection
      } ${accentObj?.styleDirection || `Speak fluently in locale ${resolvedLocale}.`} ${tone.styleDirection}`.trim();

      for (const model of [tone.ttsModel, "gemini-3.8-flash-lite-tts"]) {
        try {
          const ttsResponse = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [{ text: directedScript, speechMetadata: { style: styleInstruction } }],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName:
                      referenceVoiceProfile?.recommendedGeminiVoice || voice.geminiVoice,
                  },
                },
              },
            },
          });

          const base64Wav = extractBase64AudioFromResponse(ttsResponse);
          if (base64Wav) {
            const mp3DataUrl = wavBase64ToMp3DataUrl(base64Wav);
            return NextResponse.json({
              success: true,
              engine: mp3DataUrl ? "neural-mp3" : "gemini-tts",
              audioUrl: mp3DataUrl || `data:audio/wav;base64,${base64Wav}`,
              detectedLocale: resolvedLocale,
              accentLabel: detectedLabel,
              segments,
              durationSeconds,
              voiceName: referenceVoiceProfile?.name || voice.name,
              gender: referenceVoiceProfile?.gender || voice.gender,
              toneLabel: tone.label,
            });
          }
        } catch (err) {
          console.warn(`Gemini TTS fallback (${model}) error:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      engine: "web-speech-fallback",
      detectedLocale: resolvedLocale,
      accentLabel: detectedLabel,
      segments,
      durationSeconds,
      voiceName: voice.name,
      gender: voice.gender,
      toneLabel: tone.label,
    });
  } catch (error: unknown) {
    console.error("TTS Route Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audio generation failed" },
      { status: 500 }
    );
  }
}
