import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Request Body parsing
    const body = await req.json().catch(() => ({}));
    const { text } = body;

    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "Text prompt is required" },
        { status: 400 }
      );
    }

    // 2. ElevenLabs API Key Setup (Environment Variable + Direct Fallback)
    const apiKey =
      process.env.ELEVENLABS_API_KEY ||
      "sk_a68ea58fbf175dbecd939692aeb345cd9a0b2338b9b6356f";

    // Voice ID (Defaulting to '21m00Tcm4TlvDq8ikWAM' - Rachel, or Urdu friendly voice)
    const voiceId = "21m00Tcm4TlvDq8ikWAM";

    // 3. ElevenLabs API Call
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2", // Best model for Urdu, Hindi & English
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    // 4. Handle ElevenLabs Error Response
    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API Error Response:", errorText);
      return NextResponse.json(
        { error: `ElevenLabs Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    // 5. Convert Audio Response to Base64 Audio Data URL
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;

    return NextResponse.json({ audioUrl: audioDataUrl });
  } catch (error: any) {
    console.error("TTS Route Crash Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}