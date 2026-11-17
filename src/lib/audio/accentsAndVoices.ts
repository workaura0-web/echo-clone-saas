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
  edgeVoicesByAccent: Record<string, string>;
  urduScriptVoice: string;
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
  edgePitchDelta: number;
  edgeRateDelta: number;
  cueTag: string;
  colorClass: string;
}

export interface GlobalDemoLanguage {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  locale: string;
  maleVoice: string;
  femaleVoice: string;
  sampleText: string;
}

export const COUNTRY_ACCENTS: CountryAccent[] = [
  {
    id: "auto",
    code: "AUTO",
    country: "Auto-Detect",
    label: "Auto-Detect Language",
    lang: "en-US",
    proOnly: false,
    styleDirection:
      "Automatically identify the language and script from the input text and deliver natural studio speech.",
  },
  {
    id: "en-US",
    code: "US",
    country: "United States",
    label: "American English (US)",
    lang: "en-US",
    proOnly: false,
    styleDirection:
      "Speak in a crisp, natural American English accent with authentic US pronunciation and rhythm.",
  },
  {
    id: "en-GB",
    code: "UK",
    country: "United Kingdom",
    label: "British English (UK)",
    lang: "en-GB",
    proOnly: false,
    styleDirection:
      "Speak in an articulate British RP / London English accent with refined British vowels and cadence.",
  },
  {
    id: "en-AU",
    code: "AU",
    country: "Australia",
    label: "Australian English (AU)",
    lang: "en-AU",
    proOnly: false,
    styleDirection:
      "Speak in a warm, authentic Australian English accent with natural Aussie intonation.",
  },
  {
    id: "en-CA",
    code: "CA",
    country: "Canada",
    label: "Canadian English (CA)",
    lang: "en-CA",
    proOnly: false,
    styleDirection:
      "Speak in a clear, friendly Canadian English accent with natural North American clarity.",
  },
  {
    id: "en-PK",
    code: "PK",
    country: "South Asia",
    label: "South Asian English (PK/IN)",
    lang: "en-IN",
    proOnly: false,
    styleDirection:
      "Speak in an expressive, educated Pakistani / South Asian English accent with clear articulation.",
  },
  {
    id: "ur-PK",
    code: "UR",
    country: "Urdu / Bilingual",
    label: "Urdu & English Bilingual",
    lang: "ur-PK",
    proOnly: false,
    styleDirection:
      "Speak naturally in fluent Urdu or Urdu-English bilingual phrasing with authentic South Asian warmth and expression.",
  },
];

export const GLOBAL_DEMO_LANGUAGES: GlobalDemoLanguage[] = [
  {
    id: "en-US",
    code: "US",
    name: "English",
    nativeName: "English",
    locale: "en-US",
    maleVoice: "en-US-ChristopherNeural",
    femaleVoice: "en-US-JennyNeural",
    sampleText:
      "Echo Clone turns any written script into lifelike, multi-emotion studio audio ready for creators worldwide.",
  },
  {
    id: "ur-PK",
    code: "PK",
    name: "Urdu",
    nativeName: "اردو",
    locale: "ur-PK",
    maleVoice: "ur-IN-SalmanNeural",
    femaleVoice: "ur-IN-GulNeural",
    sampleText:
      "ایکو کلون اسٹوڈیو کے ساتھ اپنی کہانیوں اور ویڈیوز کے لیے قدرتی اور مستند اردو آواز سیکنڈوں میں بنائیں۔",
  },
  {
    id: "ar-SA",
    code: "SA",
    name: "Arabic",
    nativeName: "العربية",
    locale: "ar-SA",
    maleVoice: "ar-SA-HamedNeural",
    femaleVoice: "ar-SA-ZariyahNeural",
    sampleText:
      "استمتع بتحويل النصوص إلى أصوات بشرية طبيعية بجودة استوديو احترافية عبر منصة إيكو كلون.",
  },
  {
    id: "hi-IN",
    code: "IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    locale: "hi-IN",
    maleVoice: "hi-IN-MadhurNeural",
    femaleVoice: "hi-IN-SwaraNeural",
    sampleText:
      "इको क्लोन के साथ अपनी कहानियों, पॉडकास्ट और वीडियो के लिए बेहद स्वाभाविक आवाज़ कुछ ही सेकंड में तैयार करें।",
  },
  {
    id: "bn-BD",
    code: "BD",
    name: "Bengali",
    nativeName: "বাংলা",
    locale: "bn-BD",
    maleVoice: "bn-BD-PradeepNeural",
    femaleVoice: "bn-BD-NabanitaNeural",
    sampleText:
      "ইকো ক্লোন স্টুডিওর মাধ্যমে আপনার গল্প এবং ভিডিওর জন্য স্বাভাবিক ও স্পষ্ট ভয়েসওভার তৈরি করুন।",
  },
  {
    id: "fa-IR",
    code: "IR",
    name: "Persian",
    nativeName: "فارسی",
    locale: "fa-IR",
    maleVoice: "fa-IR-FaridNeural",
    femaleVoice: "fa-IR-DilaraNeural",
    sampleText:
      "با استودیو اکو کلون، متن خود را در چند ثانیه به صدای طبیعی و حرفه‌ای تبدیل کنید.",
  },
  {
    id: "tr-TR",
    code: "TR",
    name: "Turkish",
    nativeName: "Türkçe",
    locale: "tr-TR",
    maleVoice: "tr-TR-AhmetNeural",
    femaleVoice: "tr-TR-EmelNeural",
    sampleText:
      "Echo Clone ile senaryolarınızı saniyeler içinde doğal ve stüdyo kalitesinde seslendirmelere dönüştürün.",
  },
  {
    id: "fr-FR",
    code: "FR",
    name: "French",
    nativeName: "Français",
    locale: "fr-FR",
    maleVoice: "fr-FR-HenriNeural",
    femaleVoice: "fr-FR-DeniseNeural",
    sampleText:
      "Transformez n'importe quel script en une narration fluide et expressive grâce au studio vocal Echo Clone.",
  },
  {
    id: "de-DE",
    code: "DE",
    name: "German",
    nativeName: "Deutsch",
    locale: "de-DE",
    maleVoice: "de-DE-ConradNeural",
    femaleVoice: "de-DE-KatjaNeural",
    sampleText:
      "Verwandeln Sie jedes Skript in Sekundenschnelle in authentische Sprachaufnahmen in Studioqualität.",
  },
  {
    id: "es-ES",
    code: "ES",
    name: "Spanish",
    nativeName: "Español",
    locale: "es-ES",
    maleVoice: "es-ES-AlvaroNeural",
    femaleVoice: "es-ES-ElviraNeural",
    sampleText:
      "Convierte cualquier guion en audio natural con emociones reales y calidad profesional en segundos.",
  },
  {
    id: "pt-BR",
    code: "BR",
    name: "Portuguese",
    nativeName: "Português",
    locale: "pt-BR",
    maleVoice: "pt-BR-AntonioNeural",
    femaleVoice: "pt-BR-FranciscaNeural",
    sampleText:
      "Crie narrações naturais com qualidade de estúdio para vídeos, cursos e audiobooks em segundos.",
  },
  {
    id: "it-IT",
    code: "IT",
    name: "Italian",
    nativeName: "Italiano",
    locale: "it-IT",
    maleVoice: "it-IT-DiegoNeural",
    femaleVoice: "it-IT-ElsaNeural",
    sampleText:
      "Trasforma i tuoi testi in voci naturali ed espressive con qualità da studio professionale.",
  },
  {
    id: "ru-RU",
    code: "RU",
    name: "Russian",
    nativeName: "Русский",
    locale: "ru-RU",
    maleVoice: "ru-RU-DmitryNeural",
    femaleVoice: "ru-RU-SvetlanaNeural",
    sampleText:
      "Превращайте любой сценарий в естественную студийную озвучку с живыми эмоциями за секунды.",
  },
  {
    id: "zh-CN",
    code: "CN",
    name: "Chinese",
    nativeName: "中文",
    locale: "zh-CN",
    maleVoice: "zh-CN-YunxiNeural",
    femaleVoice: "zh-CN-XiaoxiaoNeural",
    sampleText:
      "使用 Echo Clone 语音工作室，几秒钟内将文字转化为自然富有情感的专业级配音。",
  },
  {
    id: "ja-JP",
    code: "JP",
    name: "Japanese",
    nativeName: "日本語",
    locale: "ja-JP",
    maleVoice: "ja-JP-KeitaNeural",
    femaleVoice: "ja-JP-NanamiNeural",
    sampleText:
      "Echo Cloneスタジオを使えば、あらゆる台本を数秒で自然で表現力豊かな音声に変換できます。",
  },
  {
    id: "ko-KR",
    code: "KR",
    name: "Korean",
    nativeName: "한국어",
    locale: "ko-KR",
    maleVoice: "ko-KR-InJoonNeural",
    femaleVoice: "ko-KR-SunHiNeural",
    sampleText:
      "에코 클론 스튜디오로 어떤 대본이든 몇 초 만에 자연스럽고 생생한 스튜디오 음성으로 제작하세요.",
  },
  {
    id: "id-ID",
    code: "ID",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    locale: "id-ID",
    maleVoice: "id-ID-ArdiNeural",
    femaleVoice: "id-ID-GadisNeural",
    sampleText:
      "Ubah naskah apa pun menjadi audio studio yang natural dan ekspresif hanya dalam hitungan detik.",
  },
  {
    id: "th-TH",
    code: "TH",
    name: "Thai",
    nativeName: "ภาษาไทย",
    locale: "th-TH",
    maleVoice: "th-TH-NiwatNeural",
    femaleVoice: "th-TH-PremwadeeNeural",
    sampleText:
      "เปลี่ยนบทพูดของคุณให้เป็นเสียงบรรยายระดับสตูดิโอที่เป็นธรรมชาติได้ภายในไม่กี่วินาที",
  },
];

export const LANGUAGE_REGION_STATS = [
  { region: "European & Nordic", count: "45+", examples: "English, French, German, Spanish, Italian, Portuguese, Dutch, Polish, Swedish, Turkish" },
  { region: "South & East Asian", count: "35+", examples: "Urdu, Hindi, Bengali, Chinese, Japanese, Korean, Thai, Vietnamese, Indonesian, Tamil" },
  { region: "Middle Eastern & Central Asian", count: "30+", examples: "Arabic (15+ dialects), Persian, Uzbek, Kazakh, Azerbaijani, Hebrew" },
  { region: "African & Americas", count: "30+", examples: "Swahili, Zulu, Afrikaans, Amharic, Somali, US/CA/MX/BR Regional Variants" },
];

export function detectLanguageLocale(text: string): {
  locale: string;
  label: string;
} {
  const sample = text.trim();
  if (!sample) return { locale: "en-US", label: "English (US)" };

  // Script-based zero-latency detection
  if (/[\u0600-\u06FF]/.test(sample)) {
    // Distinguish Urdu-specific Nastaliq letters (ٹ ڈ ڑ ں ے ہ ھ گ پ چ ژ) & Persian letters (گ چ پ ژ ی ک)
    if (/[ٹڈڑںےھ]/.test(sample) || /\b(اور|ہے|ہیں|نہیں|میں|کی|کا|کے|کو|سے)\b/.test(sample)) {
      return { locale: "ur-PK", label: "Urdu" };
    }
    if (/[گچپژ]/.test(sample) && !/[ٹڈڑںےھ]/.test(sample)) {
      return { locale: "fa-IR", label: "Persian (Farsi)" };
    }
    return { locale: "ar-SA", label: "Arabic" };
  }
  if (/[\u0900-\u097F]/.test(sample)) return { locale: "hi-IN", label: "Hindi" };
  if (/[\u0980-\u09FF]/.test(sample)) return { locale: "bn-BD", label: "Bengali" };
  if (/[\u0B80-\u0BFF]/.test(sample)) return { locale: "ta-IN", label: "Tamil" };
  if (/[\u0E00-\u0E7F]/.test(sample)) return { locale: "th-TH", label: "Thai" };
  if (/[\u3040-\u30FF]/.test(sample)) return { locale: "ja-JP", label: "Japanese" };
  if (/[\uAC00-\uD7AF]/.test(sample)) return { locale: "ko-KR", label: "Korean" };
  if (/[\u4E00-\u9FFF]/.test(sample)) return { locale: "zh-CN", label: "Chinese (Mandarin)" };
  if (/[\u0400-\u04FF]/.test(sample)) return { locale: "ru-RU", label: "Russian" };

  const lower = sample.toLowerCase();

  // Roman Urdu detection -> routes to en-IN / South Asian English voice for natural pronunciation
  if (
    /\b(hai|hain|hoon|hu|nahi|kya|mera|meri|tera|aap|tum|aur|main|mein|kar|raha|rahi|karta|chahiye|accha|bahut|waqt|gusse|yaadein)\b/.test(
      lower
    )
  ) {
    return { locale: "en-PK", label: "Roman Urdu / South Asian" };
  }

  if (/[ğüşöçıİ]/.test(sample)) return { locale: "tr-TR", label: "Turkish" };
  if (/\b(el|la|los|las|que|para|con|una|por|cómo|está)\b/.test(lower) && /[áéíóúñ¿¡]/i.test(sample)) {
    return { locale: "es-ES", label: "Spanish" };
  }
  if (/\b(le|la|les|des|est|dans|pour|avec|nous|vous|c'est)\b/.test(lower) && /[éèêàçù]/i.test(sample)) {
    return { locale: "fr-FR", label: "French" };
  }
  if (/\b(der|die|das|und|ist|ein|nicht|mit|auf|für)\b/.test(lower)) {
    return { locale: "de-DE", label: "German" };
  }
  if (/\b(não|para|com|você|está|uma|como|obrigado)\b/.test(lower) && /[ãõçáé]/i.test(sample)) {
    return { locale: "pt-BR", label: "Portuguese" };
  }
  if (/\b(yang|dan|untuk|dengan|ini|itu|adalah|dalam|tidak)\b/.test(lower)) {
    return { locale: "id-ID", label: "Indonesian" };
  }

  return { locale: "en-US", label: "English (US)" };
}

export const DELIVERY_TONES: DeliveryTone[] = [
  {
    id: "story",
    label: "Story Narration (Auto Multi-Emotion)",
    description:
      "Automatically detects angry, laughing, humorous, sad & suspenseful lines sentence-by-sentence.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-tts",
    styleDirection:
      "Perform as a master human storyteller and voice actor. Dynamically shift vocal emotion sentence by sentence according to the emotional cues—sounding genuinely furious on angry lines, chuckling warmly on laughing or humorous lines, tender and heartbroken on sad lines, and hushed on suspenseful lines.",
  },
  {
    id: "speech",
    label: "Public Speech / Keynote",
    description: "Commanding, persuasive stage cadence with purposeful pauses.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-lite-tts",
    styleDirection:
      "Deliver like an inspiring keynote speaker on stage—confident, commanding, rhythmic, with clear emphasis on key statements.",
  },
  {
    id: "professional",
    label: "Professional / Corporate",
    description: "Polished, authoritative broadcast & explainer tone.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-lite-tts",
    styleDirection:
      "Clear, trustworthy, polished corporate narrator or news anchor tone with crisp diction.",
  },
  {
    id: "podcast",
    label: "Conversational / Podcast",
    description: "Relaxed, candid, natural human host energy.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-tts",
    styleDirection:
      "Warm, spontaneous, conversational podcast host speaking naturally to a close friend with realistic breathing.",
  },
  {
    id: "dramatic",
    label: "Dramatic / Cinema Trailer",
    description: "Deep theatrical weight, tension, and gravitas.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-tts",
    styleDirection:
      "Intense, cinematic, dramatic theatrical performance with rich emotional contrast and deliberate pacing.",
  },
  {
    id: "neutral",
    label: "Standard Clear Read",
    description: "Balanced, clean reading for articles and guides.",
    proOnly: false,
    ttsModel: "gemini-3.8-flash-lite-tts",
    styleDirection:
      "Clean, even, pleasant natural reading voice suitable for articles and tutorials.",
  },
];

export const EMOTION_PROFILES: Record<EmotionType, EmotionProfile> = {
  calm: {
    id: "calm",
    label: "Calm / Narrative",
    pitchFactor: 1.0,
    rateFactor: 0.98,
    volumeFactor: 0.95,
    pauseAfterMs: 260,
    edgePitchDelta: 0,
    edgeRateDelta: -2,
    cueTag: "",
    colorClass: "text-slate-300 border-slate-700 bg-slate-800/70",
  },
  angry: {
    id: "angry",
    label: "Angry / Intense",
    pitchFactor: 0.9,
    rateFactor: 1.14,
    volumeFactor: 1.0,
    pauseAfterMs: 320,
    edgePitchDelta: -6,
    edgeRateDelta: 12,
    cueTag: "[fierce, sharp anger]",
    colorClass: "text-rose-300 border-rose-500/40 bg-rose-500/15",
  },
  laughing: {
    id: "laughing",
    label: "Laughing / Joyful",
    pitchFactor: 1.2,
    rateFactor: 1.08,
    volumeFactor: 1.0,
    pauseAfterMs: 280,
    edgePitchDelta: 10,
    edgeRateDelta: 7,
    cueTag: "<laugh>",
    colorClass: "text-amber-300 border-amber-500/40 bg-amber-500/15",
  },
  humorous: {
    id: "humorous",
    label: "Humorous / Playful",
    pitchFactor: 1.12,
    rateFactor: 1.06,
    volumeFactor: 0.98,
    pauseAfterMs: 260,
    edgePitchDelta: 7,
    edgeRateDelta: 5,
    cueTag: "[witty, amused chuckle]",
    colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-500/15",
  },
  sad: {
    id: "sad",
    label: "Sad / Emotional",
    pitchFactor: 0.84,
    rateFactor: 0.82,
    volumeFactor: 0.84,
    pauseAfterMs: 420,
    edgePitchDelta: -10,
    edgeRateDelta: -14,
    cueTag: "<breath> [soft, sorrowful]",
    colorClass: "text-sky-300 border-sky-500/40 bg-sky-500/15",
  },
  excited: {
    id: "excited",
    label: "Excited / Energetic",
    pitchFactor: 1.16,
    rateFactor: 1.12,
    volumeFactor: 1.0,
    pauseAfterMs: 220,
    edgePitchDelta: 8,
    edgeRateDelta: 10,
    cueTag: "[bright enthusiasm]",
    colorClass: "text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/15",
  },
  whispering: {
    id: "whispering",
    label: "Whispering / Suspense",
    pitchFactor: 0.92,
    rateFactor: 0.86,
    volumeFactor: 0.65,
    pauseAfterMs: 360,
    edgePitchDelta: -6,
    edgeRateDelta: -12,
    cueTag: "<gasp> [hushed whisper]",
    colorClass: "text-violet-300 border-violet-500/40 bg-violet-500/15",
  },
};

export const VOICES: VoicePersona[] = [
  {
    id: "v1",
    geminiVoice: "Kore",
    name: "Jessica",
    gender: "Female",
    recommendedAccent: "en-US",
    style: "Expressive & Natural",
    voiceDirection:
      "Voice persona Jessica: warm, expressive young adult female voice with crisp studio clarity and dynamic emotional inflection.",
    edgeVoicesByAccent: {
      "en-US": "en-US-JennyNeural",
      "en-GB": "en-GB-LibbyNeural",
      "en-AU": "en-AU-NatashaNeural",
      "en-CA": "en-CA-ClaraNeural",
      "en-PK": "en-IN-NeerjaNeural",
      "ur-PK": "en-IN-NeerjaNeural",
    },
    urduScriptVoice: "ur-IN-GulNeural",
    sample:
      "Hello! I am Jessica. Whether it is a tense drama or a joyful laugh, I bring every line to life.",
    basePitch: 1.06,
    baseRate: 1.0,
  },
  {
    id: "v2",
    geminiVoice: "Charon",
    name: "Arnold",
    gender: "Male",
    recommendedAccent: "en-US",
    style: "Deep & Authoritative",
    voiceDirection:
      "Voice persona Arnold: deep, resonant mature male baritone with commanding chest resonance and steady gravitas.",
    edgeVoicesByAccent: {
      "en-US": "en-US-ChristopherNeural",
      "en-GB": "en-GB-ThomasNeural",
      "en-AU": "en-AU-WilliamMultilingualNeural",
      "en-CA": "en-CA-LiamNeural",
      "en-PK": "en-IN-PrabhatNeural",
      "ur-PK": "en-IN-PrabhatNeural",
    },
    urduScriptVoice: "ur-IN-SalmanNeural",
    sample:
      "Good evening. I am Arnold, ready to deliver commanding narration and intense dramatic scenes.",
    basePitch: 0.85,
    baseRate: 0.96,
  },
  {
    id: "v3",
    geminiVoice: "Zephyr",
    name: "Alice",
    gender: "Female",
    recommendedAccent: "en-GB",
    style: "Warm Storyteller",
    voiceDirection:
      "Voice persona Alice: refined, silky female storyteller voice with gentle warmth and effortless theatrical pacing.",
    edgeVoicesByAccent: {
      "en-US": "en-US-AriaNeural",
      "en-GB": "en-GB-SoniaNeural",
      "en-AU": "en-AU-NatashaNeural",
      "en-CA": "en-CA-ClaraNeural",
      "en-PK": "en-IN-NeerjaNeural",
      "ur-PK": "en-IN-NeerjaNeural",
    },
    urduScriptVoice: "ur-IN-GulNeural",
    sample:
      "Good day! I am Alice, speaking with crisp British clarity and heartfelt emotional range.",
    basePitch: 1.05,
    baseRate: 0.98,
  },
  {
    id: "v4",
    geminiVoice: "Fenrir",
    name: "Daniel",
    gender: "Male",
    recommendedAccent: "en-GB",
    style: "Crisp & Cinematic",
    voiceDirection:
      "Voice persona Daniel: poised, cinematic male documentary narrator with crisp articulation and composed authority.",
    edgeVoicesByAccent: {
      "en-US": "en-US-GuyNeural",
      "en-GB": "en-GB-RyanNeural",
      "en-AU": "en-AU-WilliamMultilingualNeural",
      "en-CA": "en-CA-LiamNeural",
      "en-PK": "en-IN-PrabhatNeural",
      "ur-PK": "en-IN-PrabhatNeural",
    },
    urduScriptVoice: "ur-IN-SalmanNeural",
    sample:
      "Welcome. I am Daniel, bringing composed authority to documentaries, speeches, and stories.",
    basePitch: 0.89,
    baseRate: 0.96,
  },
  {
    id: "v5",
    geminiVoice: "Puck",
    name: "Matilda",
    gender: "Female",
    recommendedAccent: "en-AU",
    style: "Bright & Witty",
    voiceDirection:
      "Voice persona Matilda: lively, cheerful bright female voice full of sparkle, comedic timing, and upbeat energy.",
    edgeVoicesByAccent: {
      "en-US": "en-US-AriaNeural",
      "en-GB": "en-GB-LibbyNeural",
      "en-AU": "en-AU-NatashaNeural",
      "en-CA": "en-CA-ClaraNeural",
      "en-PK": "en-IN-NeerjaNeural",
      "ur-PK": "en-IN-NeerjaNeural",
    },
    urduScriptVoice: "ur-IN-GulNeural",
    sample:
      "Hey there! I am Matilda, built for lively comedy, upbeat podcasts, and expressive characters.",
    basePitch: 1.1,
    baseRate: 1.02,
  },
  {
    id: "v6",
    geminiVoice: "Puck",
    name: "Liam",
    gender: "Male",
    recommendedAccent: "en-CA",
    style: "Conversational Host",
    voiceDirection:
      "Voice persona Liam: friendly, relaxed conversational male podcast host with natural smile in the voice.",
    edgeVoicesByAccent: {
      "en-US": "en-US-GuyNeural",
      "en-GB": "en-GB-RyanNeural",
      "en-AU": "en-AU-WilliamMultilingualNeural",
      "en-CA": "en-CA-LiamNeural",
      "en-PK": "en-IN-PrabhatNeural",
      "ur-PK": "en-IN-PrabhatNeural",
    },
    urduScriptVoice: "ur-IN-SalmanNeural",
    sample:
      "What is going on everyone! I am Liam, bringing natural warmth and effortless humor.",
    basePitch: 0.92,
    baseRate: 1.0,
  },
  {
    id: "v7",
    geminiVoice: "Kore",
    name: "Zara",
    gender: "Female",
    recommendedAccent: "en-PK",
    style: "Poised & Multilingual",
    voiceDirection:
      "Voice persona Zara: poised, graceful South Asian / bilingual female narrator fluent in expressive English and Urdu phrasing.",
    edgeVoicesByAccent: {
      "en-US": "en-US-JennyNeural",
      "en-GB": "en-GB-SoniaNeural",
      "en-AU": "en-AU-NatashaNeural",
      "en-CA": "en-CA-ClaraNeural",
      "en-PK": "en-IN-NeerjaNeural",
      "ur-PK": "en-IN-NeerjaNeural",
    },
    urduScriptVoice: "ur-IN-GulNeural",
    sample:
      "Assalam-o-Alaikum and hello! I am Zara, fluent in natural English and expressive Urdu storytelling.",
    basePitch: 1.04,
    baseRate: 0.98,
  },
  {
    id: "v8",
    geminiVoice: "Charon",
    name: "Hamza",
    gender: "Male",
    recommendedAccent: "ur-PK",
    style: "Rich & Soulful",
    voiceDirection:
      "Voice persona Hamza: rich, soulful South Asian male storyteller voice ideal for heartfelt Urdu-English dramas and speeches.",
    edgeVoicesByAccent: {
      "en-US": "en-US-ChristopherNeural",
      "en-GB": "en-GB-ThomasNeural",
      "en-AU": "en-AU-WilliamMultilingualNeural",
      "en-CA": "en-CA-LiamNeural",
      "en-PK": "en-IN-PrabhatNeural",
      "ur-PK": "en-IN-PrabhatNeural",
    },
    urduScriptVoice: "ur-IN-SalmanNeural",
    sample:
      "Hello friends! I am Hamza, crafted for soulful stories, emotional drama, and impactful speeches.",
    basePitch: 0.87,
    baseRate: 0.95,
  },
];

export const SAMPLE_TEMPLATES = [
  {
    label: "Multi-Emotion Story",
    toneId: "story",
    text: `He slammed his fist on the table and shouted, "How dare you lie to me after everything we built together!" Suddenly, Marcus burst out laughing because he saw the tiny kitten wearing his crown. Honestly, it was the funniest royal disaster the kingdom had ever witnessed! Yet as the rain began to fall outside the window, she whispered softly, "I just wish things were the way they used to be."`,
  },
  {
    label: "Keynote Speech",
    toneId: "speech",
    text: `Ladies and gentlemen, today marks a turning point in how stories are told. Every great breakthrough started as a quiet idea that refused to give up. Stand tall, speak with conviction, and build the future you want the world to hear!`,
  },
  {
    label: "Product Promo",
    toneId: "professional",
    text: `Introducing Echo Clone Studio. Select from over 140 languages or use Auto-Detect, choose dynamic storytelling emotions, and export lifelike MP3 voiceovers in seconds.`,
  },
  {
    label: "Urdu / Bilingual Story",
    toneId: "story",
    text: `Usne gusse se kaha, "Ab bas bhi karo, main aur intezar nahi kar sakta!" Phir achanak woh dono huns paray kyunki chai mein namak gir gaya tha. Aakhir mein usne udaas lehjay mein kaha, "Waqt kitni jaldi guzar jata hai, yaadein reh jati hain."`,
  },
];
