export type EmotionType =
  | "calm"
  | "angry"
  | "laughing"
  | "humorous"
  | "sad"
  | "excited"
  | "whispering";

export interface CountryAccent {
  id: string;
  code: string;
  country: string;
  label: string;
  lang: string;
  proOnly: boolean;
  styleDirection: string;
}

export interface DeliveryTone {
  id: string;
  label: string;
  description: string;
  proOnly: boolean;
  ttsModel: "gemini-3.8-flash-tts" | "gemini-3.8-flash-lite-tts";
  styleDirection: string;
}

export interface VoicePersona {
  id: string;
  geminiVoice: "Kore" | "Zephyr" | "Puck" | "Charon" | "Fenrir";
  name: string;
  gender: "Female" | "Male";
  recommendedAccent: string;
  style: string;
  voiceDirection: string;
  sample: string;
  basePitch: number;
  baseRate: number;
}

export interface EmotionProfile {
  id: EmotionType;
  label: string;
  pitchFactor: number;
  rateFactor: number;
  volumeFactor: number;
  pauseAfterMs: number;
  cueTag: string;
  colorClass: string;
}

export const COUNTRY_ACCENTS: CountryAccent[] = [
  {
    id: "en-US",
    code: "US",
    country: "United States",
    label: "American English (US)",
    lang: "en-US",
    proOnly: false,
    styleDirection: "Speak in a crisp, natural American English accent with authentic US pronunciation and rhythm."
  },
  {
    id: "en-GB",
    code: "UK",
    country: "United Kingdom",
    label: "British English (UK)",
    lang: "en-GB",
    proOnly: false,
    styleDirection: "Speak in an articulate British RP / London English accent with refined British vowels and cadence."
  },
  {
    id: "en-AU",
    code: "AU",
    country: "Australia",
    label: "Australian English (AU)",
    lang: "en-AU",
    proOnly: true,
    styleDirection: "Speak in a warm, authentic Australian English accent with natural Aussie intonation."
  },
  {
    id: "en-CA",
    code: "CA",
    country: "Canada",
    label: "Canadian English (CA)",
    lang: "en-CA",
    proOnly: true,
    styleDirection: "Speak in a clear, friendly Canadian English accent with natural North American clarity."
  },
  {
    id: "en-PK",
    code: "PK",
    country: "South Asia",
    label: "South Asian English (PK/IN)",
    lang: "en-IN",
    proOnly: true,
    styleDirection: "Speak in an expressive, educated Pakistani / South Asian English accent with clear articulation."
  },
  {
    id: "ur-PK",
    code: "UR",
    country: "Urdu / Bilingual",
    label: "Urdu & English Bilingual",
    lang: "ur-PK",
    proOnly: true,
    styleDirection: "Speak naturally in fluent Urdu or Urdu-English bilingual phrasing with authentic South Asian warmth and expression."
  }
];

export const DELIVERY_TONES: DeliveryTone[] = [
  {
    id: "story",
    label: "Story Narration (Auto Multi-Emotion)",
    description: "Automatically detects angry, laughing, humorous, sad & suspenseful lines sentence-by-sentence.",
    proOnly: true,
    ttsModel: "gemini-3.8-flash-tts",
    styleDirection:
      "Perform as a master human storyteller and voice actor. Dynamically shift vocal emotion sentence by sentence according to the emotional cues—sounding genuinely furious on angry lines, chuckling warmly on laughing or humorous lines, tender and heartbroken on sad lines, and hushed on suspenseful lines."
  },
  {
    id: "speech",
    label: "Public Speech / Keynote",
    description: "Commanding, persuasive stage cadence with purposeful pauses.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-lite-tts",
    styleDirection:
      "Deliver like an inspiring keynote speaker on stage—confident, commanding, rhythmic, with clear emphasis on key statements."
  },
  {
    id: "professional",
    label: "Professional / Corporate",
    description: "Polished, authoritative broadcast & explainer tone.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-lite-tts",
    styleDirection:
      "Clear, trustworthy, polished corporate narrator or news anchor tone with crisp diction."
  },
  {
    id: "podcast",
    label: "Conversational / Podcast",
    description: "Relaxed, candid, natural human host energy.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-tts",
    styleDirection:
      "Warm, spontaneous, conversational podcast host speaking naturally to a close friend with realistic breathing."
  },
  {
    id: "dramatic",
    label: "Dramatic / Cinema Trailer",
    description: "Deep theatrical weight, tension, and gravitas.",
    proOnly: true,
    ttsModel: "gemini-3.8-flash-tts",
    styleDirection:
      "Intense, cinematic, dramatic theatrical performance with rich emotional contrast and deliberate pacing."
  },
  {
    id: "neutral",
    label: "Standard Clear Read",
    description: "Balanced, clean reading for articles and guides.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-lite-tts",
    styleDirection:
      "Clean, even, pleasant natural reading voice suitable for articles and tutorials."
  }
];

export const EMOTION_PROFILES: Record<EmotionType, EmotionProfile> = {
  calm: {
    id: "calm",
    label: "Calm / Narrative",
    pitchFactor: 1.0,
    rateFactor: 0.98,
    volumeFactor: 0.95,
    pauseAfterMs: 260,
    cueTag: "",
    colorClass: "text-slate-300 border-slate-700 bg-slate-800/70"
  },
  angry: {
    id: "angry",
    label: "Angry / Intense",
    pitchFactor: 0.9,
    rateFactor: 1.14,
    volumeFactor: 1.0,
    pauseAfterMs: 320,
    cueTag: "[fierce, sharp anger]",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-500/15"
  },
  laughing: {
    id: "laughing",
    label: "Laughing / Joyful",
    pitchFactor: 1.2,
    rateFactor: 1.08,
    volumeFactor: 1.0,
    pauseAfterMs: 280,
    cueTag: "<laugh>",
    colorClass: "text-amber-300 border-amber-500/40 bg-amber-500/15"
  },
  humorous: {
    id: "humorous",
    label: "Humorous / Playful",
    pitchFactor: 1.12,
    rateFactor: 1.06,
    volumeFactor: 0.98,
    pauseAfterMs: 260,
    cueTag: "[witty, amused chuckle]",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-500/15"
  },
  sad: {
    id: "sad",
    label: "Sad / Emotional",
    pitchFactor: 0.84,
    rateFactor: 0.82,
    volumeFactor: 0.84,
    pauseAfterMs: 420,
    cueTag: "<breath> [soft, sorrowful]",
    colorClass: "text-sky-300 border-sky-500/40 bg-sky-500/15"
  },
  excited: {
    id: "excited",
    label: "Excited / Energetic",
    pitchFactor: 1.16,
    rateFactor: 1.12,
    volumeFactor: 1.0,
    pauseAfterMs: 220,
    cueTag: "[bright enthusiasm]",
    colorClass: "text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/15"
  },
  whispering: {
    id: "whispering",
    label: "Whispering / Suspense",
    pitchFactor: 0.92,
    rateFactor: 0.86,
    volumeFactor: 0.65,
    pauseAfterMs: 360,
    cueTag: "<gasp> [hushed whisper]",
    colorClass: "text-violet-300 border-violet-500/40 bg-violet-500/15"
  }
};

export const VOICES: VoicePersona[] = [
  {
    id: "v1",
    geminiVoice: "Kore",
    name: "Jessica",
    gender: "Female",
    recommendedAccent: "en-US",
    style: "Expressive & Natural",
    voiceDirection: "Voice persona Jessica: warm, expressive young adult female voice with crisp studio clarity and dynamic emotional inflection.",
    sample: "Hello! I am Jessica. Whether it is a tense drama or a joyful laugh, I bring every line to life.",
    basePitch: 1.06,
    baseRate: 1.0
  },
  {
    id: "v2",
    geminiVoice: "Charon",
    name: "Arnold",
    gender: "Male",
    recommendedAccent: "en-US",
    style: "Deep & Authoritative",
    voiceDirection: "Voice persona Arnold: deep, resonant mature male baritone with commanding chest resonance and steady gravitas.",
    sample: "Good evening. I am Arnold, ready to deliver commanding narration and intense dramatic scenes.",
    basePitch: 0.85,
    baseRate: 0.96
  },
  {
    id: "v3",
    geminiVoice: "Zephyr",
    name: "Alice",
    gender: "Female",
    recommendedAccent: "en-GB",
    style: "Warm Storyteller",
    voiceDirection: "Voice persona Alice: refined, silky female storyteller voice with gentle warmth and effortless theatrical pacing.",
    sample: "Good day! I am Alice, speaking with crisp British clarity and heartfelt emotional range.",
    basePitch: 1.05,
    baseRate: 0.98
  },
  {
    id: "v4",
    geminiVoice: "Fenrir",
    name: "Daniel",
    gender: "Male",
    recommendedAccent: "en-GB",
    style: "Crisp & Cinematic",
    voiceDirection: "Voice persona Daniel: poised, cinematic male documentary narrator with crisp articulation and composed authority.",
    sample: "Welcome. I am Daniel, bringing composed authority to documentaries, speeches, and stories.",
    basePitch: 0.89,
    baseRate: 0.96
  },
  {
    id: "v5",
    geminiVoice: "Puck",
    name: "Matilda",
    gender: "Female",
    recommendedAccent: "en-AU",
    style: "Bright & Witty",
    voiceDirection: "Voice persona Matilda: lively, cheerful bright female voice full of sparkle, comedic timing, and upbeat energy.",
    sample: "Hey there! I am Matilda, built for lively comedy, upbeat podcasts, and expressive characters.",
    basePitch: 1.1,
    baseRate: 1.02
  },
  {
    id: "v6",
    geminiVoice: "Puck",
    name: "Liam",
    gender: "Male",
    recommendedAccent: "en-CA",
    style: "Conversational Host",
    voiceDirection: "Voice persona Liam: friendly, relaxed conversational male podcast host with natural smile in the voice.",
    sample: "What is going on everyone! I am Liam, bringing natural warmth and effortless humor.",
    basePitch: 0.92,
    baseRate: 1.0
  },
  {
    id: "v7",
    geminiVoice: "Kore",
    name: "Zara",
    gender: "Female",
    recommendedAccent: "en-PK",
    style: "Poised & Multilingual",
    voiceDirection: "Voice persona Zara: poised, graceful South Asian / bilingual female narrator fluent in expressive English and Urdu phrasing.",
    sample: "Assalam-o-Alaikum and hello! I am Zara, fluent in natural English and expressive Urdu storytelling.",
    basePitch: 1.04,
    baseRate: 0.98
  },
  {
    id: "v8",
    geminiVoice: "Charon",
    name: "Hamza",
    gender: "Male",
    recommendedAccent: "ur-PK",
    style: "Rich & Soulful",
    voiceDirection: "Voice persona Hamza: rich, soulful South Asian male storyteller voice ideal for heartfelt Urdu-English dramas and speeches.",
    sample: "Hello friends! I am Hamza, crafted for soulful stories, emotional drama, and impactful speeches.",
    basePitch: 0.87,
    baseRate: 0.95
  }
];

export const SAMPLE_TEMPLATES = [
  {
    label: "Multi-Emotion Story",
    toneId: "story",
    text: `He slammed his fist on the table and shouted, "How dare you lie to me after everything we built together!" Suddenly, Marcus burst out laughing because he saw the tiny kitten wearing his crown. Honestly, it was the funniest royal disaster the kingdom had ever witnessed! Yet as the rain began to fall outside the window, she whispered softly, "I just wish things were the way they used to be."`
  },
  {
    label: "Keynote Speech",
    toneId: "speech",
    text: `Ladies and gentlemen, today marks a turning point in how stories are told. Every great breakthrough started as a quiet idea that refused to give up. Stand tall, speak with conviction, and build the future you want the world to hear!`
  },
  {
    label: "Product Promo",
    toneId: "professional",
    text: `Introducing Echo Clone Studio. Select your regional accent, choose dynamic storytelling emotions, and turn any written script into lifelike studio audio in seconds.`
  },
  {
    label: "Urdu / Bilingual Story",
    toneId: "story",
    text: `Usne gusse se kaha, "Ab bas bhi karo, main aur intezar nahi kar sakta!" Phir achanak woh dono huns paray kyunki chai mein namak gir gaya tha. Aakhir mein usne udaas lehjay mein kaha, "Waqt kitni jaldi guzar jata hai, yaadein reh jati hain."`
  }
];
