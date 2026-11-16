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
    } = body as {
      text?: string;
      voiceId?: string;
      accentId?: string;
      toneId?: string;
      speed?: number;
      pitch?: number;
      customSegments?: AnalyzedSegment[];
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

    // If no Gemini key is configured in environment, return rich segmented Web Speech fallback
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

    // Step 1: For Story / Dramatic modes (when user didn't pass custom overrides),
    // analyze every sentence's exact emotion using gemini-4-hydrogen
    if (
      (!Array.isArray(customSegments) || customSegments.length === 0) &&
      (tone.id === "story" || tone.id === "dramatic")
    ) {
      try {
        const analysisResponse = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Analyze this script sentence by sentence for a voice actor. Classify each sentence's dominant emotion from: calm, angry, laughing, humorous, sad, excited, whispering. Keep the exact original sentence text untouched.\n\nScript:\n${text}`,
          config: {
            systemInstruction:
              "You are an expert voice acting director. Segment the provided script into natural sentences/clauses preserving exact wording, and tag each segment with the most fitting emotion (angry for rage/shouting, laughing for laughter/joy, humorous for funny/witty/comedy, sad for grief/sorrow, whispering for hushed/secret, excited for enthusiasm, calm for neutral narrative).",
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

    // Step 2: Compose directed script for Gemini TTS with regional accent + per-sentence emotional cues
    const directedScript =
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

    const paceDescriptor =
      Number(speed) > 1.15
        ? "Speak at a brisk, energetic pace."
        : Number(speed) < 0.88
        ? "Speak slowly and deliberately."
        : "Speak at a natural human pace.";

    const pitchDescriptor =
      Number(pitch) > 1.12
        ? "Use a slightly brighter, higher vocal register."
        : Number(pitch) < 0.88
        ? "Use a deeper, richer lower vocal register."
        : "";

    const styleInstruction = `${accent.styleDirection} ${tone.styleDirection} ${paceDescriptor} ${pitchDescriptor}`.trim();

    try {
      const ttsResponse = await ai.models.generateContent({
        model: tone.ttsModel,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: directedScript,
                speechMetadata: {
                  style: styleInstruction,
                },
              },
            ],
          },
        ],
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

      const base64Audio =
        ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

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
    } catch (ttsError) {
      console.warn("Gemini TTS error, using expressive Web Speech fallback:", ttsError);
    }

    // Fallback if Gemini audio generation hits quota or unavailable
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