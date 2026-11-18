export interface AnalyzedReferenceProfile {
  gender: "Male" | "Female";
  pitchRegister: "very-low" | "low" | "medium" | "high" | "very-high";
  pitchMultiplier: number;
  speakingRate: number;
  toneId: "story" | "speech" | "professional" | "podcast" | "dramatic" | "neutral";
  recommendedVoiceId: string;
  recommendedGeminiVoice: "Kore" | "Zephyr" | "Puck" | "Charon" | "Fenrir";
  voiceStylePrompt: string;
  summaryBadge: string;
  estimatedHz?: number;
}

export async function blobToBase64Data(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read audio data."));
    reader.readAsDataURL(blob);
  });
}

function estimateFundamentalFrequencyHz(samples: Float32Array, sampleRate: number): number | undefined {
  // Take up to 4 seconds from the most energetic middle region
  const maxSamples = Math.min(samples.length, sampleRate * 4);
  const startOffset = Math.max(0, Math.floor((samples.length - maxSamples) / 2));
  const frameSize = Math.min(2048, maxSamples);
  if (frameSize < 512) return undefined;

  const minLag = Math.floor(sampleRate / 320); // max 320 Hz
  const maxLag = Math.min(frameSize - 1, Math.floor(sampleRate / 70)); // min 70 Hz
  if (maxLag <= minLag) return undefined;

  const hop = Math.max(frameSize, Math.floor(maxSamples / 6));
  const pitches: number[] = [];

  for (let offset = startOffset; offset + frameSize <= startOffset + maxSamples; offset += hop) {
    let rms = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = samples[offset + i];
      rms += s * s;
    }
    rms = Math.sqrt(rms / frameSize);
    if (rms < 0.015) continue; // skip silence

    let bestLag = -1;
    let bestCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < frameSize - lag; i++) {
        const a = samples[offset + i];
        const b = samples[offset + i + lag];
        sum += a * b;
        normA += a * a;
        normB += b * b;
      }
      const denom = Math.sqrt(normA * normB);
      const corr = denom > 0 ? sum / denom : 0;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag > 0 && bestCorr > 0.42) {
      pitches.push(sampleRate / bestLag);
    }
  }

  if (pitches.length === 0) return undefined;
  pitches.sort((a, b) => a - b);
  return Math.round(pitches[Math.floor(pitches.length / 2)]);
}

export async function analyzeAudioAcousticsClient(
  blob: Blob
): Promise<AnalyzedReferenceProfile> {
  let estimatedHz: number | undefined;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      try {
        const arrayBuf = await blob.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        const channel = decoded.getChannelData(0);
        estimatedHz = estimateFundamentalFrequencyHz(channel, decoded.sampleRate);
      } finally {
        await ctx.close().catch(() => undefined);
      }
    }
  } catch {
    // Graceful fallback if codec isn't decodable offline
  }

  const isFemale = estimatedHz !== undefined ? estimatedHz >= 165 : false;
  const pitchRegister: AnalyzedReferenceProfile["pitchRegister"] =
    estimatedHz === undefined
      ? "medium"
      : estimatedHz < 110
      ? "very-low"
      : estimatedHz < 145
      ? "low"
      : estimatedHz < 195
      ? "medium"
      : estimatedHz < 235
      ? "high"
      : "very-high";

  const pitchMultiplier =
    estimatedHz === undefined
      ? 1.0
      : Number(
          Math.max(
            0.78,
            Math.min(1.22, isFemale ? estimatedHz / 200 : estimatedHz / 125)
          ).toFixed(2)
        );

  const recommendedVoiceId = isFemale
    ? pitchRegister === "high" || pitchRegister === "very-high"
      ? "v8"
      : "v1"
    : pitchRegister === "very-low" || pitchRegister === "low"
    ? "v2"
    : "v5";

  const recommendedGeminiVoice: AnalyzedReferenceProfile["recommendedGeminiVoice"] =
    isFemale
      ? pitchRegister === "high" || pitchRegister === "very-high"
        ? "Zephyr"
        : "Kore"
      : pitchRegister === "very-low" || pitchRegister === "low"
      ? "Charon"
      : "Fenrir";

  const summaryBadge = isFemale
    ? `${pitchRegister === "high" || pitchRegister === "very-high" ? "Bright" : "Warm"} Female · ${
        estimatedHz ? `${estimatedHz}Hz` : "Natural Pace"
      }`
    : `${pitchRegister === "very-low" || pitchRegister === "low" ? "Deep" : "Balanced"} Male · ${
        estimatedHz ? `${estimatedHz}Hz` : "Natural Pace"
      }`;

  return {
    gender: isFemale ? "Female" : "Male",
    pitchRegister,
    pitchMultiplier,
    speakingRate: 1.0,
    toneId: "neutral",
    recommendedVoiceId,
    recommendedGeminiVoice,
    voiceStylePrompt: isFemale
      ? "Natural conversational female voice with balanced resonance, clear articulation, and steady expressive cadence"
      : "Warm resonant male voice with grounded chest timbre, steady pacing, and clear natural inflection",
    summaryBadge,
    estimatedHz,
  };
}
