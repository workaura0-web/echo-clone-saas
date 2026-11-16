import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { Mp3Encoder } from "@breezystack/lamejs";
import {
  COUNTRY_ACCENTS,
  DELIVERY_TONES,
  EMOTION_PROFILES,
  EmotionType,
  VOICES,
  VoicePersona,
} from "@/lib/audio/accentsAndVoices";
import { analyzeScriptEmotionsLocally, AnalyzedSegment } from "@/lib/audio/speechSynth";

export const runtime = "nodejs";
export const maxDuration = 60;

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

function splitLongTextForEdge(text: string, maxLen = 450): string[] {
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

async function synthesizeWithEdgeNeuralMp3(
  segments: AnalyzedSegment[],
  voice: VoicePersona,
  accentId: string,
  toneId: string,
  speed: number,
  pitch: number,
  isPreview: boolean
): Promise<string | null> {
  const defaultEdgeVoice =
    voice.edgeVoicesByAccent[accentId] ||
    voice.edgeVoicesByAccent["en-US"] ||
    (voice.gender === "Male" ? "en-US-GuyNeural" : "en-US-JennyNeural");

  const speedPctBase = (Number(speed || 1) - 1) * 100;
  const pitchPctBase = (Number(pitch || 1) - 1) * 55;

  const toneRateOffset =
    toneId === "speech" ? -6 : toneId === "dramatic" ? -8 : toneId === "podcast" ? 3 : 0;
  const tonePitchOffset =
    toneId === "dramatic" ? -5 : toneId === "speech" ? -2 : toneId === "podcast" ? 2 : 0;

  const mp3Buffers: Buffer[] = [];
  let activeVoice = "";
  let tts: MsEdgeTTS | null = null;

  try {
    for (const seg of segments) {
      const hasUrduScript = URDU_ARABIC_REGEX.test(seg.text);
      const segmentVoice = hasUrduScript ? voice.urduScriptVoice : defaultEdgeVoice;

      if (!tts || activeVoice !== segmentVoice) {
        if (tts) {
          tts.close();
        }
        tts = new MsEdgeTTS({ connectionTimeoutMs: 12000, synthesisTimeoutMs: 25000 });
        await tts.setMetadata(segmentVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        activeVoice = segmentVoice;
      }

      const emo = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
      const isStoryOrDrama = !isPreview && (toneId === "story" || toneId === "dramatic");
      const emoRate = isStoryOrDrama ? emo.edgeRateDelta : 0;
      const emoPitch = isStoryOrDrama ? emo.edgePitchDelta : 0;

      const isUrduVoice = segmentVoice.startsWith("ur-");
      const rateStr = formatSignedPercent(speedPctBase + toneRateOffset + emoRate);
      const pitchStr = formatSignedPercent(pitchPctBase + tonePitchOffset + emoPitch);

      const chunksOfText = splitLongTextForEdge(seg.text, 420);
      for (const piece of chunksOfText) {
        const escaped = escapeXmlForSsml(piece);
        const prosody = isUrduVoice ? {} : { rate: rateStr, pitch: pitchStr };

        const { audioStream } = tts.toStream(escaped, prosody);
        const rawParts: Buffer[] = [];
        for await (const chunk of audioStream) {
          rawParts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        if (rawParts.length > 0) {
          mp3Buffers.push(Buffer.concat(rawParts));
        }
      }
    }

    if (mp3Buffers.length === 0) return null;
    const mergedMp3 = Buffer.concat(mp3Buffers);
    if (mergedMp3.length < 256) return null;

    return `data:audio/mpeg;base64,${mergedMp3.toString("base64")}`;
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

    // Gemini unary WAV output is 24kHz mono 16-bit signed PCM with 44-byte RIFF header
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
      isPreview = false,
    } = body as {
      text?: string;
      voiceId?: string;
      accentId?: string;
      toneId?: string;
      speed?: number;
      pitch?: number;
      customSegments?: AnalyzedSegment[];
      isPreview?: boolean;
    };

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json({ error: "Text script is required." }, { status: 400 });
    }

    if (text.length > 20000) {
      return NextResponse.json(
        { error: "Script must be 20,000 characters or fewer." },
        { status: 400 }
      );
    }

    const voice = VOICES.find((v) => v.id === voiceId) || VOICES[0];
    const accent = COUNTRY_ACCENTS.find((a) => a.id === accentId) || COUNTRY_ACCENTS[0];
    const tone = DELIVERY_TONES.find((t) => t.id === toneId) || DELIVERY_TONES[0];

    const wordCount = text.trim().split(/\s+/).length;
    const durationSeconds = Math.max(2, Math.ceil(wordCount / (2.4 * (Number(speed) || 1))));

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    let segments: AnalyzedSegment[] =
      Array.isArray(customSegments) && customSegments.length > 0
        ? customSegments
        : analyzeScriptEmotionsLocally(text, tone.id);

    // Optional AI Emotion Analysis when GEMINI_API_KEY is available in server environment
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

    // Primary Zero-Key Human Neural Voice Engine (Distinct Male & Female Voices per Country Accent -> Real 96kbps MP3)
    const neuralMp3Url = await synthesizeWithEdgeNeuralMp3(
      segments,
      voice,
      accent.id,
      tone.id,
      Number(speed) || 1,
      Number(pitch) || 1,
      Boolean(isPreview)
    );

    if (neuralMp3Url) {
      return NextResponse.json({
        success: true,
        engine: "neural-mp3",
        audioUrl: neuralMp3Url,
        segments,
        durationSeconds,
        voiceName: voice.name,
        gender: voice.gender,
        accentLabel: accent.label,
        toneLabel: tone.label,
      });
    }

    // Secondary Neural Engine via Gemini TTS (if GEMINI_API_KEY is configured and Edge TTS failed)
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

      const styleInstruction = `${voice.voiceDirection} ${accent.styleDirection} ${tone.styleDirection}`.trim();

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
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.geminiVoice } },
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
              segments,
              durationSeconds,
              voiceName: voice.name,
              gender: voice.gender,
              accentLabel: accent.label,
              toneLabel: tone.label,
            });
          }
        } catch (err) {
          console.warn(`Gemini TTS fallback (${model}) error:`, err);
        }
      }
    }

    // Last-resort browser fallback only if both server neural engines are unreachable
    return NextResponse.json({
      success: true,
      engine: "web-speech-fallback",
      segments,
      durationSeconds,
      voiceName: voice.name,
      gender: voice.gender,
      accentLabel: accent.label,
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
