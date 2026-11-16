import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import {
  COUNTRY_ACCENTS,
  DELIVERY_TONES,
  EMOTION_PROFILES,
  EmotionType,
  VOICES,
} from "@/lib/audio/accentsAndVoices";
import { analyzeScriptEmotionsLocally, AnalyzedSegment } from "@/lib/audio/speechSynth";

const VALID_EMOTIONS: EmotionType[] = [
  "calm",
  "angry",
  "laughing",
  "humorous",
  "sad",
  "excited",
  "whispering",
];

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

    const apiKey = process.env.GEMINI_API_KEY;
    let segments: AnalyzedSegment[] =
      Array.isArray(customSegments) && customSegments.length > 0
        ? customSegments
        : analyzeScriptEmotionsLocally(text, tone.id);

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({
        success: true,
        engine: "web-speech-fallback",
        segments,
        durationSeconds,
        voiceName: voice.name,
        accentLabel: accent.label,
        toneLabel: tone.label,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Step 1: Analyze sentence emotions in Story/Dramatic mode (skip for short voice previews)
    if (
      !isPreview &&
      (!Array.isArray(customSegments) || customSegments.length === 0) &&
      (tone.id === "story" || tone.id === "dramatic")
    ) {
      try {
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

    // Step 2: Compose directed script with vocal bursts and emotional acting cues
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

    const paceDescriptor =
      Number(speed) > 1.15
        ? "Speak at a brisk, energetic pace."
        : Number(speed) < 0.88
        ? "Speak slowly and deliberately."
        : "Speak at a natural human pace.";

    const pitchDescriptor =
      Number(pitch) > 1.12
        ? "Use a brighter, slightly higher vocal register."
        : Number(pitch) < 0.88
        ? "Use a deeper, richer lower vocal register."
        : "";

    const styleInstruction = `${voice.voiceDirection} ${accent.styleDirection} ${
      isPreview ? "Deliver a clear, charismatic studio voice sample." : tone.styleDirection
    } ${paceDescriptor} ${pitchDescriptor}`.trim();

    // Step 3: Resilient multi-model TTS chain (3.8-flash-tts -> 3.8-flash-lite-tts -> 2.5-flash-preview-tts)
    const candidateModels: Array<{ model: string; useSpeechMetadata: boolean }> = [
      { model: isPreview ? "gemini-3.8-flash-lite-tts" : tone.ttsModel, useSpeechMetadata: true },
      { model: "gemini-3.8-flash-lite-tts", useSpeechMetadata: false },
      { model: "gemini-2.5-flash-preview-tts", useSpeechMetadata: false },
    ];

    for (const attempt of candidateModels) {
      try {
        const partPayload = attempt.useSpeechMetadata
          ? {
              text: directedScript,
              speechMetadata: { style: styleInstruction },
            }
          : {
              text: `Voice Direction: ${styleInstruction}\n\nSpeak naturally:\n${directedScript}`,
            };

        const ttsResponse = await ai.models.generateContent({
          model: attempt.model,
          contents: [{ role: "user", parts: [partPayload] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice.geminiVoice,
                },
              },
            },
          },
        });

        const base64Audio = extractBase64AudioFromResponse(ttsResponse);
        if (base64Audio) {
          return NextResponse.json({
            success: true,
            engine: "gemini-tts",
            audioUrl: `data:audio/wav;base64,${base64Audio}`,
            segments,
            durationSeconds,
            voiceName: voice.name,
            accentLabel: accent.label,
            toneLabel: tone.label,
          });
        }
      } catch (err) {
        console.warn(`Gemini TTS attempt (${attempt.model}) failed:`, err);
      }
    }

    // Fallback when Gemini audio generation is unavailable or quota-limited
    return NextResponse.json({
      success: true,
      engine: "web-speech-fallback",
      segments,
      durationSeconds,
      voiceName: voice.name,
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