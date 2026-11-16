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

const URDU_ARABIC_REGEX = /[\u0600-\u06FF]/;

// Local deterministic sentence-by-sentence emotion detector (English + Roman Urdu + Urdu script)
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

    // Angry / Intense indicators (English + Roman Urdu + Urdu)
    if (
      /\b(angry|furious|shout|shouted|yell|yelled|slam|slammed|how dare|hate|liar|lie|stop|never|gusse|gussa|bas bhi|chilla|bewakoof|nafrat|khabardar|niklo)\b/.test(
        lower
      ) ||
      /(غصے|غصہ|خبردار|بکواس|چلایا|نفرت|نکلو|جھوٹ)/.test(sentence) ||
      (sentence.includes("!") &&
        /\b(dare|hell|damn|leave|get out|enough|nahi|mat)\b/.test(lower))
    ) {
      return { text: sentence, emotion: "angry", cue: "intense sharp tone" };
    }

    // Laughing / Joyful indicators
    if (
      /\b(laugh|laughed|laughing|haha|hehe|lol|chuckle|giggle|burst out|huns|hansa|hansi|qahqaha|muskura|haste)\b/.test(
        lower
      ) ||
      /(ہنس|قہقہہ|مسکرا|خوشی)/.test(sentence)
    ) {
      return { text: sentence, emotion: "laughing", cue: "warm chuckle" };
    }

    // Humorous / Funny / Witty indicators
    if (
      /\b(funny|funniest|hilarious|joke|comedy|ridiculous|disaster|silly|weird|absurd|clown|kitten|namak|mazaq|mazahiya|lateefa)\b/.test(
        lower
      ) ||
      /(مذاق|مزاحیہ|لطیفہ|مزاح)/.test(sentence)
    ) {
      return { text: sentence, emotion: "humorous", cue: "playful amused tone" };
    }

    // Sad / Melancholic indicators
    if (
      /\b(sad|cry|cried|tears|sorry|wish|miss|lonely|heartbroken|grief|rain|lost|goodbye|udaas|dukh|afsos|rona|ansoo|yaad|tanha|khamoshi)\b/.test(
        lower
      ) ||
      /(اداس|دکھ|افسوس|آنسو|رونا|تنہا|یادیں|غم)/.test(sentence)
    ) {
      return { text: sentence, emotion: "sad", cue: "soft sorrowful cadence" };
    }

    // Whispering / Suspense indicators
    if (
      /\b(whisper|whispered|softly|quietly|secret|shadow|dark|hush|shh|ahista|chupke|raaz)\b/.test(
        lower
      ) ||
      /(سرگوشی|آہستہ|چپکے|راز|اندھیرا)/.test(sentence)
    ) {
      return { text: sentence, emotion: "whispering", cue: "hushed suspense" };
    }

    // Excited / Enthusiastic indicators
    if (
      sentence.includes("!") ||
      /\b(amazing|incredible|wow|breakthrough|victory|celebrate|waah|kamaal|zindabad|shabash)\b/.test(
        lower
      ) ||
      /(واہ|کمال|شاباش|شاندار|زبردست)/.test(sentence)
    ) {
      return { text: sentence, emotion: "excited", cue: "energetic delivery" };
    }

    return { text: sentence, emotion: "calm", cue: "steady narration" };
  });
}

// Wait briefly for browser SpeechSynthesis voices (fixes empty array on first Chrome call)
export async function waitForBrowserVoices(timeoutMs = 450): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }

  const immediate = window.speechSynthesis.getVoices();
  if (immediate && immediate.length > 0) {
    return immediate;
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
      resolve(window.speechSynthesis.getVoices() || []);
    };
    const onChanged = () => done();
    window.speechSynthesis.addEventListener("voiceschanged", onChanged);
    setTimeout(done, timeoutMs);
  });
}

// Score voices so Neural / Natural / Google / Enhanced voices always beat robotic OS voices
function scoreVoiceCandidate(
  v: SpeechSynthesisVoice,
  voice: VoicePersona,
  targetLang: string,
  hasUrduScript: boolean
): number {
  let score = 0;
  const nameLower = v.name.toLowerCase();
  const langLower = v.lang.toLowerCase();
  const targetLower = targetLang.toLowerCase();

  if (hasUrduScript) {
    if (langLower.startsWith("ur")) score += 80;
    else if (langLower.startsWith("hi")) score += 55;
    else if (langLower.includes("in")) score += 25;
  } else {
    if (langLower === targetLower) score += 70;
    else if (langLower.startsWith(targetLower.slice(0, 2))) score += 35;
  }

  // Quality tier boosts
  if (nameLower.includes("natural") || nameLower.includes("neural")) score += 60;
  if (nameLower.includes("google")) score += 45;
  if (nameLower.includes("online")) score += 35;
  if (nameLower.includes("enhanced") || nameLower.includes("premium")) score += 40;
  if (nameLower.includes("espeak") || nameLower.includes("festival")) score -= 60;

  // Gender & persona name matching
  const femaleHints = [
    "female",
    "woman",
    "samantha",
    "victoria",
    "karen",
    "serena",
    "kate",
    "moira",
    "zira",
    "hazel",
    "susan",
    "aria",
    "jenny",
    "libby",
    "sonia",
    "natasha",
    "neerja",
    "uzma",
    "clara",
    "ava",
  ];
  const maleHints = [
    "male",
    "man",
    "daniel",
    "alex",
    "fred",
    "george",
    "oliver",
    "david",
    "mark",
    "ryan",
    "guy",
    "rishi",
    "prabhat",
    "asad",
    "william",
    "liam",
    "brian",
    "andrew",
    "christopher",
  ];

  const desiredHints = voice.gender === "Female" ? femaleHints : maleHints;
  const oppositeHints = voice.gender === "Female" ? maleHints : femaleHints;

  if (nameLower.includes(voice.name.toLowerCase())) score += 50;
  if (desiredHints.some((h) => nameLower.includes(h))) score += 30;
  if (oppositeHints.some((h) => nameLower.includes(h))) score -= 25;

  return score;
}

export function getBrowserVoice(
  voice: VoicePersona,
  accentLang?: string,
  sampleText = ""
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const hasUrduScript = URDU_ARABIC_REGEX.test(sampleText);
  const targetLang = hasUrduScript
    ? "ur-PK"
    : accentLang === "ur-PK"
    ? "en-IN"
    : accentLang || "en-US";

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;

  for (const candidate of voices) {
    const sc = scoreVoiceCandidate(candidate, voice, targetLang, hasUrduScript);
    if (sc > bestScore) {
      bestScore = sc;
      bestVoice = candidate;
    }
  }

  return bestVoice || voices[0] || null;
}

// Split long paragraphs into <=165 char natural clauses to prevent Chrome's 15-second SpeechSynthesis cutoff
function splitIntoNaturalClauses(text: string): string[] {
  if (text.length <= 165) return [text];

  const clauses = text
    .split(/(?<=[,;:\u2014])\s+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const result: string[] = [];
  let current = "";
  for (const clause of clauses) {
    if ((current + " " + clause).trim().length <= 165) {
      current = (current + " " + clause).trim();
    } else {
      if (current) result.push(current);
      if (clause.length <= 165) {
        current = clause;
      } else {
        // Word wrap chunking
        const words = clause.split(/\s+/);
        let chunk = "";
        for (const w of words) {
          if ((chunk + " " + w).trim().length <= 155) {
            chunk = (chunk + " " + w).trim();
          } else {
            if (chunk) result.push(chunk);
            chunk = w;
          }
        }
        current = chunk;
      }
    }
  }
  if (current) result.push(current);
  return result.length > 0 ? result : [text];
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

  waitForBrowserVoices().then(() => {
    const accent = COUNTRY_ACCENTS.find((a) => a.id === options.accentId);
    const hasUrdu = URDU_ARABIC_REGEX.test(text);
    const resolvedLang = hasUrdu
      ? "ur-PK"
      : accent?.lang === "ur-PK"
      ? "en-IN"
      : accent?.lang || "en-US";

    const utterance = new SpeechSynthesisUtterance(text);
    const matchedVoice = getBrowserVoice(voice, resolvedLang, text);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || resolvedLang;
    } else {
      utterance.lang = resolvedLang;
    }
    utterance.pitch = Math.max(0.55, Math.min(1.85, voice.basePitch * (options.pitch ?? 1)));
    utterance.rate = Math.max(0.65, Math.min(1.75, voice.baseRate * (options.rate ?? 1)));
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
  });
}

// Multi-segment expressive playback controller with async voice wait, clause splitting & per-sentence emotions
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

  waitForBrowserVoices().then(() => {
    if (cancelled) return;

    const playSegment = (segIdx: number) => {
      if (cancelled) return;
      if (segIdx >= segments.length) {
        options.onComplete?.();
        return;
      }

      const seg = segments[segIdx];
      const emo = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
      const clauses = splitIntoNaturalClauses(seg.text);
      const hasUrdu = URDU_ARABIC_REGEX.test(seg.text);
      const resolvedLang = hasUrdu
        ? "ur-PK"
        : accent?.lang === "ur-PK"
        ? "en-IN"
        : accent?.lang || "en-US";
      const matchedVoice = getBrowserVoice(voice, resolvedLang, seg.text);

      options.onSegmentStart?.(segIdx);

      const playClause = (clauseIdx: number) => {
        if (cancelled) return;
        if (clauseIdx >= clauses.length) {
          timerId = setTimeout(() => playSegment(segIdx + 1), emo.pauseAfterMs);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(clauses[clauseIdx]);
        if (matchedVoice) {
          utterance.voice = matchedVoice;
          utterance.lang = matchedVoice.lang || resolvedLang;
        } else {
          utterance.lang = resolvedLang;
        }

        utterance.pitch = Math.max(
          0.55,
          Math.min(1.85, voice.basePitch * (options.basePitch ?? 1) * emo.pitchFactor)
        );
        utterance.rate = Math.max(
          0.6,
          Math.min(1.75, voice.baseRate * (options.baseRate ?? 1) * emo.rateFactor)
        );
        utterance.volume = emo.volumeFactor;

        utterance.onend = () => {
          if (cancelled) return;
          const microPause = clauseIdx < clauses.length - 1 ? 95 : 0;
          timerId = setTimeout(() => playClause(clauseIdx + 1), microPause);
        };

        utterance.onerror = (e) => {
          if (cancelled) return;
          if (e.error === "canceled" || e.error === "interrupted") return;
          playClause(clauseIdx + 1);
        };

        window.speechSynthesis.speak(utterance);
      };

      playClause(0);
    };

    playSegment(0);
  });

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
