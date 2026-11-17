"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getPlanDefinition,
  PLANS,
  PlanDefinition,
  PlanId,
  STOREFRONT_PLAN_IDS,
} from "@/lib/plans";
import { subscribePricingPlans } from "@/lib/firebase/db";
import {
  COUNTRY_ACCENTS,
  EMOTION_PROFILES,
  GLOBAL_DEMO_LANGUAGES,
  LANGUAGE_REGION_STATS,
  SAMPLE_TEMPLATES,
  VOICES,
} from "@/lib/audio/accentsAndVoices";
import {
  analyzeScriptEmotionsLocally,
  speakSegmentsExpressively,
  speakSingleText,
  stopSpeaking,
} from "@/lib/audio/speechSynth";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  Download,
  Film,
  Globe2,
  GraduationCap,
  Headphones,
  Mic,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Sliders,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

const AEO_FAQS = [
  {
    question: "How many languages and voices does Echo Clone support?",
    answer:
      "Echo Clone supports 140+ regional locales and 300+ distinct Male and Female neural voices across English (US, UK, AU, CA, IN), Urdu, Arabic, Hindi, Bengali, Persian, Turkish, French, German, Spanish, Chinese, Japanese, Korean, and more—plus instant Auto-Detect.",
  },
  {
    question: "How does multi-emotion Story Mode work?",
    answer:
      "When Story Narration is selected, Echo Clone analyzes your script sentence by sentence—dynamically adjusting tone, pace, and vocal tension across Angry, Laughing, Humorous, Sad, Whispering, and Excited lines, with manual override controls per line.",
  },
  {
    question: "Do I need external API keys or extra subscriptions?",
    answer:
      "No. Echo Clone runs out of the box with built-in neural MP3 synthesis, synced cloud history, voice reference profiles, and real-time package quotas—zero external keys required.",
  },
  {
    question: "How do PKR packages, credits, and instant MP3 downloads work?",
    answer:
      "Start with Starter Free (10,000 credits) or pick Starter (PKR 2,000 / 1M credits), Creator (PKR 5,000 / 3M credits), Pro (PKR 7,000 / 5M credits), or Business (PKR 10,000 / 10M credits). Every generation exports cleanly as MP3 directly in Chrome.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Languages & Regional Dialects",
    echo: "140+ locales · 300+ neural voices",
    others: "10–30 basic voices",
  },
  {
    feature: "Auto-Detect Script Language",
    echo: "Instant Urdu / Arabic / EU / Asian detection",
    others: "Manual switching only",
  },
  {
    feature: "Sentence-by-Sentence Story Emotions",
    echo: "Angry, Laughing, Sad, Whispering & Humor",
    others: "Flat single-tone read",
  },
  {
    feature: "True Male & Female Voice Separation",
    echo: "Dedicated neural personas per gender & locale",
    others: "Pitch-shifted generic clones",
  },
  {
    feature: "Reference Audio Mic & Profile Studio",
    echo: "Upload or record mic sample + custom pitch",
    others: "Paid enterprise add-on",
  },
  {
    feature: "Chrome MP3 Export & Library Sync",
    echo: "Included on all plans (up to 250K chars)",
    others: "Strict char caps or extra fee",
  },
  {
    feature: "Local PKR Creator Pricing",
    echo: "From PKR 2,000 / 1M credits",
    others: "Expensive USD-only billing",
  },
];

const USE_CASES = [
  {
    icon: Film,
    title: "YouTube & Faceless Channels",
    description:
      "Produce documentaries, horror stories, and commentary videos in US, UK, or Urdu voices with dramatic emotion shifts.",
    cardClass: "border-rose-500/25 bg-gradient-to-br from-rose-950/30 via-[#0d1124] to-[#0a0e1d] hover:border-rose-400/50",
    iconClass: "bg-gradient-to-br from-rose-500/25 to-orange-500/20 text-rose-300 border border-rose-500/30",
  },
  {
    icon: BookOpen,
    title: "Audiobooks & Urdu Novels",
    description:
      "Narrate multi-chapter fiction up to 250,000 characters with distinct character energy and natural breathing.",
    cardClass: "border-violet-500/25 bg-gradient-to-br from-violet-950/35 via-[#0d1124] to-[#0a0e1d] hover:border-violet-400/50",
    iconClass: "bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 text-violet-300 border border-violet-500/30",
  },
  {
    icon: Radio,
    title: "Podcasts & Radio Shows",
    description:
      "Blend conversational hosting with humorous, excited, or calm segments ready for broadcast mastering.",
    cardClass: "border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 via-[#0d1124] to-[#0a0e1d] hover:border-cyan-400/50",
    iconClass: "bg-gradient-to-br from-cyan-500/25 to-sky-500/20 text-cyan-300 border border-cyan-500/30",
  },
  {
    icon: GraduationCap,
    title: "Courses & E-Learning",
    description:
      "Localize training lessons into 140+ languages with crisp articulation and adjustable speed from 0.5x to 2.0x.",
    cardClass: "border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 via-[#0d1124] to-[#0a0e1d] hover:border-emerald-400/50",
    iconClass: "bg-gradient-to-br from-emerald-500/25 to-teal-500/20 text-emerald-300 border border-emerald-500/30",
  },
  {
    icon: Headphones,
    title: "Reels, Shorts & Ads",
    description:
      "Generate punchy, high-retention commercial hooks and export clean MP3 tracks straight into your video editor.",
    cardClass: "border-amber-500/25 bg-gradient-to-br from-amber-950/25 via-[#0d1124] to-[#0a0e1d] hover:border-amber-400/50",
    iconClass: "bg-gradient-to-br from-amber-500/25 to-orange-500/20 text-amber-300 border border-amber-500/30",
  },
  {
    icon: Briefcase,
    title: "Agencies & Media Teams",
    description:
      "Scale client voiceovers with up to 10,000,000 monthly credits, reference voice profiles, and full commercial rights.",
    cardClass: "border-indigo-500/25 bg-gradient-to-br from-indigo-950/35 via-[#0d1124] to-[#0a0e1d] hover:border-indigo-400/50",
    iconClass: "bg-gradient-to-br from-indigo-500/25 to-blue-500/20 text-indigo-300 border border-indigo-500/30",
  },
];

const REGION_CARD_STYLES = [
  {
    card: "border-sky-500/30 bg-gradient-to-br from-sky-950/35 to-[#0b1022]",
    count: "text-sky-300",
  },
  {
    card: "border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-[#0b1022]",
    count: "text-amber-300",
  },
  {
    card: "border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-[#0b1022]",
    count: "text-emerald-300",
  },
  {
    card: "border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-[#0b1022]",
    count: "text-rose-300",
  },
];

const PRICING_THEMES: Record<
  string,
  { card: string; price: string; credits: string; button: string }
> = {
  free: {
    card: "border-cyan-500/35 bg-gradient-to-b from-cyan-950/30 via-[#0d1328] to-[#090d1c]",
    price: "text-cyan-200",
    credits: "text-cyan-300",
    button: "bg-cyan-600/90 hover:bg-cyan-500 text-white",
  },
  starter: {
    card: "border-sky-500/35 bg-gradient-to-b from-sky-950/30 via-[#0d1328] to-[#090d1c]",
    price: "text-sky-200",
    credits: "text-sky-300",
    button: "bg-sky-600/90 hover:bg-sky-500 text-white",
  },
  creator: {
    card: "border-fuchsia-400/70 bg-gradient-to-b from-violet-950/55 via-fuchsia-950/20 to-[#090d1c] shadow-xl shadow-fuchsia-950/30",
    price: "text-white",
    credits: "text-fuchsia-300",
    button: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 text-white shadow-md shadow-fuchsia-600/25",
  },
  pro: {
    card: "border-emerald-500/35 bg-gradient-to-b from-emerald-950/30 via-[#0d1328] to-[#090d1c]",
    price: "text-emerald-200",
    credits: "text-emerald-300",
    button: "bg-emerald-600/90 hover:bg-emerald-500 text-white",
  },
  business: {
    card: "border-amber-500/35 bg-gradient-to-b from-amber-950/25 via-[#0d1328] to-[#090d1c]",
    price: "text-amber-200",
    credits: "text-amber-300",
    button: "bg-amber-600/90 hover:bg-amber-500 text-white",
  },
};

const WAVE_BAR_COLORS = [
  "bg-violet-400",
  "bg-fuchsia-400",
  "bg-cyan-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-sky-400",
  "bg-rose-400",
];

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Live Admin-Editable Pricing Plans from Firestore
  const [livePlansMap, setLivePlansMap] = useState<Record<PlanId, PlanDefinition>>(PLANS);

  // Interactive Hero Demo State (Story Mode vs 18-Language Global Mode)
  const [demoTab, setDemoTab] = useState<"story" | "languages">("story");
  const [demoAccent, setDemoAccent] = useState("en-US");
  const [selectedLangId, setSelectedLangId] = useState(GLOBAL_DEMO_LANGUAGES[0].id);
  const [langGender, setLangGender] = useState<"Female" | "Male">("Female");
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number | null>(null);
  const demoAudioRef = useRef<HTMLAudioElement | null>(null);
  const demoCacheRef = useRef<Map<string, string>>(new Map());

  const storySample = SAMPLE_TEMPLATES[0].text;
  const demoSegments = analyzeScriptEmotionsLocally(storySample, "story");
  const activeGlobalLang =
    GLOBAL_DEMO_LANGUAGES.find((l) => l.id === selectedLangId) ||
    GLOBAL_DEMO_LANGUAGES[0];

  useEffect(() => {
    const unsubPlans = subscribePricingPlans((plansMap) => {
      setLivePlansMap(plansMap);
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => setIsInstalled(true);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      unsubPlans();
      stopSpeaking();
      if (demoAudioRef.current) demoAudioRef.current.pause();
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const stopDemoAudio = () => {
    stopSpeaking();
    if (demoAudioRef.current) {
      demoAudioRef.current.pause();
      demoAudioRef.current.currentTime = 0;
    }
    setIsDemoPlaying(false);
    setActiveSentenceIdx(null);
  };

  const playDemoMp3 = (audioUrl: string, trackSentences: boolean) => {
    const audio = new Audio(audioUrl);
    demoAudioRef.current = audio;
    setIsDemoPlaying(true);

    audio.ontimeupdate = () => {
      if (!trackSentences || !audio.duration || demoSegments.length === 0) return;
      const ratio = audio.currentTime / audio.duration;
      const idx = Math.min(
        demoSegments.length - 1,
        Math.floor(ratio * demoSegments.length)
      );
      setActiveSentenceIdx(idx);
    };
    audio.onended = () => {
      setIsDemoPlaying(false);
      setActiveSentenceIdx(null);
    };
    audio.onerror = () => {
      setIsDemoPlaying(false);
      setActiveSentenceIdx(null);
    };
    audio.play().catch(() => {
      setIsDemoPlaying(false);
      setActiveSentenceIdx(null);
    });
  };

  const handlePlayStoryDemo = async () => {
    if (isDemoPlaying) {
      stopDemoAudio();
      return;
    }

    const cacheKey = `story:${demoAccent}`;
    const cached = demoCacheRef.current.get(cacheKey);
    if (cached) {
      playDemoMp3(cached, true);
      return;
    }

    setIsDemoLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: storySample,
          voiceId: VOICES[0].id,
          accentId: demoAccent,
          toneId: "story",
          customSegments: demoSegments,
        }),
      });
      const data = await res.json();
      if (res.ok && data.audioUrl) {
        demoCacheRef.current.set(cacheKey, data.audioUrl);
        playDemoMp3(data.audioUrl, true);
        return;
      }
    } catch {
      // Browser expressive fallback below
    } finally {
      setIsDemoLoading(false);
    }

    setIsDemoPlaying(true);
    speakSegmentsExpressively(demoSegments, VOICES[0], {
      accentId: demoAccent,
      onSegmentStart: (idx) => setActiveSentenceIdx(idx),
      onComplete: () => {
        setIsDemoPlaying(false);
        setActiveSentenceIdx(null);
      },
      onError: () => {
        setIsDemoPlaying(false);
        setActiveSentenceIdx(null);
      },
    });
  };

  const handlePlayLanguageSample = async (
    langItem = activeGlobalLang,
    gender = langGender
  ) => {
    stopDemoAudio();
    const edgeVoice =
      gender === "Male" ? langItem.maleVoice : langItem.femaleVoice;
    const cacheKey = `lang:${langItem.id}:${edgeVoice}`;
    const cached = demoCacheRef.current.get(cacheKey);
    if (cached) {
      playDemoMp3(cached, false);
      return;
    }

    setIsDemoLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: langItem.sampleText,
          voiceId: gender === "Male" ? VOICES[1].id : VOICES[0].id,
          accentId: langItem.locale,
          toneId: "neutral",
          customEdgeVoice: edgeVoice,
        }),
      });
      const data = await res.json();
      if (res.ok && data.audioUrl) {
        demoCacheRef.current.set(cacheKey, data.audioUrl);
        playDemoMp3(data.audioUrl, false);
        return;
      }
    } catch {
      // Fallback below
    } finally {
      setIsDemoLoading(false);
    }

    setIsDemoPlaying(true);
    speakSingleText(
      langItem.sampleText,
      gender === "Male" ? VOICES[1] : VOICES[0],
      {
        accentId: langItem.locale,
        onEnd: () => setIsDemoPlaying(false),
        onError: () => setIsDemoPlaying(false),
      }
    );
  };

  const visiblePlans = STOREFRONT_PLAN_IDS.map((id) =>
    getPlanDefinition(id, livePlansMap)
  )
    .filter((p) => p.isVisible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const pricingGridClass =
    visiblePlans.length >= 5
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5"
      : visiblePlans.length === 4
      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
      : visiblePlans.length === 3
      ? "grid grid-cols-1 md:grid-cols-3 gap-6"
      : visiblePlans.length === 2
      ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl"
      : "grid grid-cols-1 max-w-md";

  const freePlan = getPlanDefinition("free", livePlansMap);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto w-full px-6 py-16 md:py-24 space-y-24">
        {/* Hero Split Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-xs font-semibold tracking-wide bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              140+ Global Languages · Multi-Emotion Story Director · Chrome MP3 Studio
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08] [text-wrap:balance]">
              Turn any script into{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                human, multi-emotion speech.
              </span>
            </h1>

            <p className="text-base text-slate-300 leading-relaxed max-w-xl">
              Generate natural male and female voices across 140+ languages with instant Auto-Detect, custom reference audio profiles, and sentence-level story acting—from fiery anger to genuine laughter.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/studio/tts"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 transition-all whitespace-nowrap"
              >
                <span>Open Voice Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-100 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                View Packages
              </Link>
              {!isInstalled && installPrompt && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/40 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> Install App
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-indigo-500/20">
              <div>
                <p className="text-2xl font-extrabold text-cyan-300 font-mono tabular-nums">140+</p>
                <p className="text-xs text-slate-400 mt-0.5">Languages & Locales</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-300 font-mono tabular-nums">300+</p>
                <p className="text-xs text-slate-400 mt-0.5">Male & Female Voices</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-amber-300 font-mono tabular-nums">7</p>
                <p className="text-xs text-slate-400 mt-0.5">Story Emotion Shifts</p>
              </div>
            </div>
          </div>

          {/* Interactive Dual-Mode Studio Preview */}
          <div className="lg:col-span-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-[#121735]/90 via-[#0d1229]/95 to-[#090d1e] overflow-hidden flex flex-col justify-between shadow-2xl shadow-indigo-950/50">
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
            <div className="p-6 md:p-7 flex-1 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Top Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-500/20">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-indigo-500/25">
                    <button
                      type="button"
                      onClick={() => {
                        stopDemoAudio();
                        setDemoTab("story");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        demoTab === "story"
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Story Emotion Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopDemoAudio();
                        setDemoTab("languages");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        demoTab === "languages"
                          ? "bg-gradient-to-r from-cyan-600 to-sky-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      18 World Languages
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      demoTab === "story"
                        ? handlePlayStoryDemo()
                        : isDemoPlaying
                        ? stopDemoAudio()
                        : handlePlayLanguageSample()
                    }
                    disabled={isDemoLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 disabled:opacity-60 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap shrink-0"
                  >
                    {isDemoLoading ? (
                      <>Synthesizing...</>
                    ) : isDemoPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Stop Preview
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-slate-950" /> Play Sample
                      </>
                    )}
                  </button>
                </div>

                {/* Live Colorful Spectrum Bars When Playing */}
                {isDemoPlaying && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-950/70 border border-cyan-500/30">
                    <span className="text-[11px] font-semibold text-cyan-300">
                      Playing Neural Studio Audio
                    </span>
                    <div className="flex items-center gap-1 h-4" aria-hidden="true">
                      {WAVE_BAR_COLORS.map((colorCls, i) => (
                        <span
                          key={i}
                          className={`w-1 h-full rounded-full echo-wave-bar ${colorCls}`}
                          style={{ animationDelay: `${i * 0.11}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {demoTab === "story" ? (
                  <>
                    {/* Country Accent Segmented Selector */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-indigo-500/20">
                      {COUNTRY_ACCENTS.filter((a) => a.id !== "auto")
                        .slice(0, 5)
                        .map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setDemoAccent(acc.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              demoAccent === acc.id
                                ? "bg-gradient-to-r from-indigo-600/80 to-cyan-600/80 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {acc.code} · {acc.country}
                          </button>
                        ))}
                    </div>

                    {/* Sentence Emotion Breakdown */}
                    <div className="space-y-2.5">
                      {demoSegments.map((seg, idx) => {
                        const emo = EMOTION_PROFILES[seg.emotion];
                        const isActive = activeSentenceIdx === idx;
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border transition-colors ${
                              isActive
                                ? "border-cyan-400 bg-indigo-950/70"
                                : "border-indigo-500/20 bg-slate-950/65"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[11px] font-mono text-slate-400">
                                Sentence 0{idx + 1}
                              </span>
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${emo.colorClass}`}
                              >
                                {emo.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">
                              {seg.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {/* Male / Female Switch + Selected Native Script Card */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-300">
                        Click any language below to audition native speech
                      </span>
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-indigo-500/25 shrink-0">
                        {(["Female", "Male"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              setLangGender(g);
                              if (isDemoPlaying) stopDemoAudio();
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              langGender === g
                                ? g === "Female"
                                  ? "bg-fuchsia-600 text-white"
                                  : "bg-sky-600 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 18-Language Compact Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {GLOBAL_DEMO_LANGUAGES.map((lang) => {
                        const active = selectedLangId === lang.id;
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => {
                              setSelectedLangId(lang.id);
                              handlePlayLanguageSample(lang, langGender);
                            }}
                            className={`px-2 py-2 rounded-lg border text-left transition-all ${
                              active
                                ? "border-cyan-400 bg-gradient-to-br from-cyan-600/25 to-violet-600/20 text-white"
                                : "border-indigo-500/20 bg-slate-950/65 text-slate-300 hover:border-cyan-500/40"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>{lang.code}</span>
                              <Volume2 className="w-3 h-3 text-cyan-400" />
                            </div>
                            <p className="text-xs font-semibold truncate mt-0.5">
                              {lang.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Native Script Preview */}
                    <div className="rounded-xl border border-cyan-500/25 bg-slate-950/75 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-cyan-200">
                          {activeGlobalLang.name} ({activeGlobalLang.nativeName})
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {langGender === "Male"
                            ? activeGlobalLang.maleVoice
                            : activeGlobalLang.femaleVoice}
                        </span>
                      </div>
                      <p
                        dir={
                          ["ur-PK", "ar-SA", "fa-IR"].includes(activeGlobalLang.id)
                            ? "rtl"
                            : "ltr"
                        }
                        className="text-xs text-slate-200 leading-relaxed"
                      >
                        {activeGlobalLang.sampleText}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-indigo-500/20 flex items-center justify-between text-xs text-slate-400">
                <span>Want 300+ voices, Auto-Detect & Mic Cloning?</span>
                <Link
                  href="/studio/tts"
                  className="text-cyan-300 hover:text-cyan-200 font-semibold flex items-center gap-1 whitespace-nowrap"
                >
                  Open Full Studio <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Workflow + Studio Capabilities */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Studio-grade voice production in 3 simple steps
            </h2>
            <p className="text-sm text-slate-300">
              Everything works right inside Chrome—no coding, no external API keys, and instant MP3 mastering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/45 via-[#0f1329] to-[#0a0e1d] p-6 space-y-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 border border-violet-400/30 text-violet-300 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                01. Pick Voice or Record Profile
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Choose from 300+ distinct male and female neural voices across 140+ locales, or upload/record a reference audio sample in the studio.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/45 via-[#0f1329] to-[#0a0e1d] p-6 space-y-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/30 to-sky-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                02. Auto-Detect & Direct Emotions
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paste Urdu, English, Arabic, or any script—Auto-Detect locks the language while Story Mode directs anger, laughter, humor, and sadness per sentence.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/45 via-[#0f1329] to-[#0a0e1d] p-6 space-y-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                03. Fine-Tune & Export MP3
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Control playback speed (0.5x–2.0x), quality steps, silence trimming, and export studio MP3 files directly into your Chrome Downloads and Library.
              </p>
            </div>
          </div>
        </section>

        {/* Global Languages & Regional Matrix */}
        <section className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#111736]/85 via-[#0c1026] to-[#090d1c] p-8 md:p-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Globe2 className="w-4 h-4" />
                <span>Global Neural Voice Engine</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                140+ Regional Locales & 300+ Human Voices
              </h2>
              <p className="text-sm text-slate-300">
                Every accent renders with dedicated native male and female speakers—including Pakistani Urdu, Arabic dialects, Hindi, Turkish, European, and East Asian scripts.
              </p>
            </div>
            <Link
              href="/studio/tts"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white text-xs font-semibold transition-all whitespace-nowrap self-start md:self-auto"
            >
              Browse Voice Library <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {LANGUAGE_REGION_STATS.map((region, idx) => {
              const theme = REGION_CARD_STYLES[idx % REGION_CARD_STYLES.length];
              return (
                <div
                  key={region.region}
                  className={`rounded-xl border p-5 space-y-2 ${theme.card}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{region.region}</h3>
                    <span className={`text-xs font-mono font-bold tabular-nums ${theme.count}`}>
                      {region.count}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {region.examples}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Competitive Comparison Table */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Why creators switch to Echo Clone
            </h2>
            <p className="text-sm text-slate-300">
              Built to deliver deeper emotional storytelling, broader global dialects, and transparent PKR pricing.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/30 bg-[#0c1125]/90 overflow-hidden shadow-xl shadow-indigo-950/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gradient-to-r from-slate-950 via-indigo-950/60 to-slate-950 border-b border-indigo-500/25 text-slate-300">
                  <tr>
                    <th className="py-4 px-6 font-semibold">Studio Capability</th>
                    <th className="py-4 px-6 font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                      Echo Clone Studio
                    </th>
                    <th className="py-4 px-6 font-semibold text-slate-400">Standard TTS Tools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/15">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="hover:bg-indigo-950/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-200">
                        {row.feature}
                      </td>
                      <td className="py-4 px-6 text-emerald-300 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{row.echo}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <X className="w-4 h-4 text-rose-500/60 shrink-0" />
                          <span>{row.others}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 6 Creator & Business Use Cases */}
        <section className="space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Built for every audio & video workflow
            </h2>
            <p className="text-sm text-slate-300">
              From solo Urdu storytellers to high-volume automation agencies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {USE_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`rounded-2xl border p-6 space-y-3 transition-colors ${item.cardClass}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live Admin-Synced PKR Pricing Section */}
        <section id="pricing" className="space-y-8 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Packages tailored to your production scale
              </h2>
              <p className="text-sm text-slate-300">
                Start with {freePlan.characterLimit.toLocaleString()} free trial credits or scale from 1M to 10M monthly credits in PKR.
              </p>
            </div>
            <Link
              href="/checkout?plan=free"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/35 bg-emerald-950/35 hover:bg-emerald-900/45 text-xs font-semibold text-emerald-200 transition-colors whitespace-nowrap self-start md:self-auto"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                Try {freePlan.name} ({freePlan.characterLimit.toLocaleString()} Credits)
              </span>
            </Link>
          </div>

          <div className={pricingGridClass}>
            {visiblePlans.map((plan) => {
              const isHighlighted = plan.isPopular;
              const theme = PRICING_THEMES[plan.id] || PRICING_THEMES.starter;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-6 flex flex-col justify-between space-y-6 ${theme.card}`}
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                        {isHighlighted && (
                          <span className="text-[11px] font-bold bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent whitespace-nowrap">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 min-h-[32px]">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-extrabold font-mono tabular-nums ${theme.price}`}>
                          PKR {plan.pricePkrAmount.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">
                          / {plan.validityDays}d
                        </span>
                      </div>
                      <p className={`text-xs font-mono tabular-nums font-semibold ${theme.credits}`}>
                        {plan.characterLimit.toLocaleString()} credits · {plan.approxHoursLabel} · {plan.priceDisplayUsd}
                      </p>
                    </div>

                    <ul className="space-y-2.5 pt-3 border-t border-white/10">
                      {plan.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-200"
                        >
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/checkout?plan=${plan.id}`}
                    className={`w-full py-2.5 px-4 rounded-xl text-center text-xs font-semibold transition-all whitespace-nowrap ${theme.button}`}
                  >
                    Select {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* AEO FAQ Section & FAQPage Structured Data */}
        <section id="faq" className="space-y-8 scroll-mt-24">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: AEO_FAQS.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              }),
            }}
          />

          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-300">
              Clear answers about 140+ languages, multi-emotion storytelling, MP3 exports, and live PKR packages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AEO_FAQS.map((item, idx) => (
              <article
                key={idx}
                className="rounded-xl border border-indigo-500/25 bg-[#0d1226]/80 p-6 space-y-2"
              >
                <h3 className="text-sm font-bold text-white leading-snug">
                  {item.question}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-indigo-500/20 py-8 bg-[#060915]/90">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="p-[1.5px] rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400">
              <Image
                src="/echo-icon-192.png"
                alt="Echo Clone Logo"
                width={24}
                height={24}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-[6px] object-cover block bg-slate-950"
              />
            </span>
            <span>© 2026 Echo Clone Studio. Built by ABM.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/studio/tts" className="hover:text-cyan-300 transition-colors">
              Studio
            </Link>
            <Link href="/library" className="hover:text-violet-300 transition-colors">
              Library
            </Link>
            <Link href="/checkout" className="hover:text-fuchsia-300 transition-colors">
              Packages
            </Link>
            <Link href="/dashboard" className="hover:text-amber-300 transition-colors">
              Dashboard
            </Link>
            <a
              href="https://wa.me/923000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              WhatsApp Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}