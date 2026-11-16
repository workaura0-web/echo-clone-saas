import {
  COUNTRY_ACCENTS,
  EMOTION_PROFILES,
  EmotionType,
  VOICES,
  VoicePersona,
} from "./accentsAndVoices";

export { VOICES };
export type { VoicePersona };

export interface AnalyzedSegment {
  text: string;
  emotion: EmotionType;
  cue?: string;
}

// Local deterministic sentence-by-sentence emotion detector (instant preview & zero-key fallback)
export function analyzeScriptEmotionsLocally(
  text: string,
  toneId: string
): AnalyzedSegment[] {
  const rawSentences = text
    .split(/(?<=[.!?।۔\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSentences.length === 0 && text.trim()) {
    rawSentences.push(text.trim());
  }

  return rawSentences.map((sentence) => {
    if (toneId !== "story" && toneId !== "dramatic") {
      if (toneId === "speech" || toneId === "podcast") {
        return { text: sentence, emotion: "excited" as EmotionType };
      }
      return { text: sentence, emotion: "calm" as EmotionType };
    }

    const lower = sentence.toLowerCase();

    // Angry / Intense indicators (English + Roman Urdu)
    if (
      /\b(angry|furious|shout|shouted|yell|yelled|slam|slammed|how dare|hate|liar|lie|stop|never|gusse|gussa|bas bhi|chilla|bewakoof|nafrat)\b/.test(
        lower
      ) ||
      (sentence.includes("!") && /\b(dare|hell|damn|leave|get out|enough|nahi|mat)\b/.test(lower))
    ) {
      return { text: sentence, emotion: "angry", cue: "intense sharp tone" };
    }

    // Laughing / Joyful indicators
    if (
      /\b(laugh|laughed|laughing|haha|hehe|lol|chuckle|giggle|burst out|huns|hansa|hansi|qahqaha|muskura)\b/.test(
        lower
      )
    ) {
      return { text: sentence, emotion: "laughing", cue: "warm chuckle" };
    }

    // Humorous / Funny / Witty indicators
    if (
      /\b(funny|funniest|hilarious|joke|comedy|ridiculous|disaster|silly|weird|absurd|clown|kitten|namak|mazaq|mazahiya|lateefa)\b/.test(
        lower
      )
    ) {
      return { text: sentence, emotion: "humorous", cue: "playful amused tone" };
    }

    // Sad / Melancholic indicators
    if (
      /\b(sad|cry|cried|tears|sorry|wish|miss|lonely|heartbroken|grief|rain|lost|goodbye|udaas|dukh|afsos|rona|ansoo|yaad|tanha)\b/.test(
        lower
      )
    ) {
      return { text: sentence, emotion: "sad", cue: "soft sorrowful cadence" };
    }

    // Whispering / Suspense indicators
    if (
      /\b(whisper|whispered|softly|quietly|secret|shadow|dark|hush|shh|ahista|chupke|raaz)\b/.test(
        lower
      )
    ) {
      return { text: sentence, emotion: "whispering", cue: "hushed suspense" };
    }

    // Excited / Enthusiastic indicators
    if (sentence.includes("!") || /\b(amazing|incredible|wow|breakthrough|victory|celebrate|waah|kamaal)\b/.test(lower)) {
      return { text: sentence, emotion: "excited", cue: "energetic delivery" };
    }

    return { text: sentence, emotion: "calm", cue: "steady narration" };
  });
}

export function getBrowserVoice(
  voice: VoicePersona,
  accentLang?: string
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLang = accentLang || "en-US";
  const exactLangVoices = voices.filter(
    (v) => v.lang.toLowerCase() === targetLang.toLowerCase()
  );
  const familyVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(targetLang.slice(0, 2).toLowerCase())
  );
  const pool = exactLangVoices.length > 0 ? exactLangVoices : familyVoices;

  if (pool.length > 0) {
    const genderLower = voice.gender.toLowerCase();
    const femaleHints = ["female", "woman", "samantha", "victoria", "karen", "serena", "kate", "moira", "zira", "hazel", "susan", "aria", "jenny", "libby"];
    const maleHints = ["male", "man", "daniel", "alex", "fred", "george", "oliver", "david", "mark", "ryan", "guy", "rishi"];
    const hints = genderLower === "female" ? femaleHints : maleHints;

    const matched = pool.find((v) => {
      const n = v.name.toLowerCase();
      return hints.some((h) => n.includes(h)) || n.includes(voice.name.toLowerCase());
    });
    return matched || pool[0];
  }

  return voices[0] || null;
}

export function speakSingleText(
  text: string,
  voice: VoicePersona,
  options: {
    accentId?: string;
    pitch?: number;
    rate?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  } = {}
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onError?.(new Error("Web Speech API is not supported in this browser."));
    return;
  }

  window.speechSynthesis.cancel();

  const accent = COUNTRY_ACCENTS.find((a) => a.id === options.accentId);
  const utterance = new SpeechSynthesisUtterance(text);
  const matchedVoice = getBrowserVoice(voice, accent?.lang);
  if (matchedVoice) utterance.voice = matchedVoice;
  utterance.lang = accent?.lang || "en-US";
  utterance.pitch = Math.max(0.5, Math.min(2.0, voice.basePitch * (options.pitch ?? 1)));
  utterance.rate = Math.max(0.5, Math.min(2.0, voice.baseRate * (options.rate ?? 1)));
  utterance.volume = options.volume ?? 1.0;

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (e) => {
    if (e.error !== "canceled" && e.error !== "interrupted") {
      options.onError?.(e);
    } else {
      options.onEnd?.();
    }
  };

  window.speechSynthesis.speak(utterance);
}

// Multi-segment expressive playback controller (cancels cleanly, applies per-sentence emotion pitch/rate/pauses)
export function speakSegmentsExpressively(
  segments: AnalyzedSegment[],
  voice: VoicePersona,
  options: {
    accentId?: string;
    basePitch?: number;
    baseRate?: number;
    onSegmentStart?: (index: number) => void;
    onComplete?: () => void;
    onError?: (err: unknown) => void;
  } = {}
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onError?.(new Error("Web Speech API is unavailable in this browser."));
    return () => undefined;
  }

  let cancelled = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  window.speechSynthesis.cancel();

  const accent = COUNTRY_ACCENTS.find((a) => a.id === options.accentId);
  const matchedVoice = getBrowserVoice(voice, accent?.lang);

  const playNext = (index: number) => {
    if (cancelled) return;
    if (index >= segments.length) {
      options.onComplete?.();
      return;
    }

    const seg = segments[index];
    const emo = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
    const utterance = new SpeechSynthesisUtterance(seg.text);

    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.lang = accent?.lang || "en-US";
    utterance.pitch = Math.max(
      0.5,
      Math.min(2.0, voice.basePitch * (options.basePitch ?? 1) * emo.pitchFactor)
    );
    utterance.rate = Math.max(
      0.5,
      Math.min(1.9, voice.baseRate * (options.baseRate ?? 1) * emo.rateFactor)
    );
    utterance.volume = emo.volumeFactor;

    utterance.onstart = () => {
      if (!cancelled) options.onSegmentStart?.(index);
    };

    utterance.onend = () => {
      if (cancelled) return;
      timerId = setTimeout(() => playNext(index + 1), emo.pauseAfterMs);
    };

    utterance.onerror = (e) => {
      if (cancelled) return;
      if (e.error === "canceled" || e.error === "interrupted") return;
      playNext(index + 1);
    };

    window.speechSynthesis.speak(utterance);
  };

  playNext(0);

  return () => {
    cancelled = true;
    if (timerId) clearTimeout(timerId);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// Synthesize an offline WAV fallback clip when Gemini server TTS is unavailable
export async function generateFallbackWavUrl(
  segments: AnalyzedSegment[],
  durationEstimate: number
): Promise<string> {
  const sampleRate = 24000;
  const duration = Math.max(1.5, Math.min(25, durationEstimate));
  const numFrames = Math.floor(sampleRate * duration);

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx({ sampleRate });
  const buffer = audioCtx.createBuffer(1, numFrames, sampleRate);
  const channelData = buffer.getChannelData(0);

  const segCount = Math.max(1, segments.length);
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const segIdx = Math.min(segCount - 1, Math.floor((i / numFrames) * segCount));
    const emo = EMOTION_PROFILES[segments[segIdx]?.emotion || "calm"] || EMOTION_PROFILES.calm;

    const pitchFreq = 135 * emo.pitchFactor + 18 * Math.sin(2 * Math.PI * 1.4 * t);
    const envelope = Math.max(0, Math.sin(Math.PI * (i / numFrames)));
    const syllableGate = 0.5 + 0.5 * Math.sin(2 * Math.PI * (3.5 * emo.rateFactor) * t);

    const wave =
      Math.sin(2 * Math.PI * pitchFreq * t) * 0.45 +
      Math.sin(2 * Math.PI * pitchFreq * 2.2 * t) * 0.2 +
      Math.sin(2 * Math.PI * 620 * t) * 0.1;

    channelData[i] = wave * envelope * syllableGate * 0.35;
  }

  const wavBlob = audioBufferToWavBlob(buffer);
  audioCtx.close().catch(() => undefined);
  return URL.createObjectURL(wavBlob);
}

function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sample: number;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: "audio/wav" });
}
