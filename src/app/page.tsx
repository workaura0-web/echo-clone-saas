"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PLANS, PlanId } from "@/lib/plans";
import {
  COUNTRY_ACCENTS,
  EMOTION_PROFILES,
  SAMPLE_TEMPLATES,
  VOICES,
} from "@/lib/audio/accentsAndVoices";
import {
  analyzeScriptEmotionsLocally,
  speakSegmentsExpressively,
  stopSpeaking,
} from "@/lib/audio/speechSynth";
import {
  ArrowRight,
  Check,
  Download,
  Globe2,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const AEO_FAQS = [
  {
    question: "How does Echo Clone multi-emotion Story Mode work?",
    answer:
      "When you select Story Narration, Echo Clone automatically analyzes your script sentence by sentence—shifting vocal tone, pace, and emotional cues across Angry, Laughing, Humorous, Sad, Whispering, and Excited lines, with manual override controls per line.",
  },
  {
    question: "Which regional accents are available in Echo Clone?",
    answer:
      "You can generate speech in American English (US), British English (UK), Australian English (AU), Canadian English (CA), South Asian English (PK/IN), and Urdu-English Bilingual delivery.",
  },
  {
    question: "Do I need external ElevenLabs or Supabase API keys?",
    answer:
      "No. Echo Clone runs out of the box with built-in neural speech synthesis, automatic expressive browser voice fallback, and synced cloud account persistence—zero external API keys required.",
  },
  {
    question: "How do monthly packages and expiry notifications work?",
    answer:
      "Every account starts with Starter Free (10,000 characters / 30 days) and can upgrade to Creator Pro or Studio Enterprise. Echo Clone tracks character usage in real time and sends instant bell and dashboard alerts when your quota reaches 80%, hits 100%, or approaches expiry.",
  },
];

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Interactive Story & Accent Demo State
  const [demoAccent, setDemoAccent] = useState("en-US");
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number | null>(null);
  const demoAudioRef = useRef<HTMLAudioElement | null>(null);
  const demoCacheRef = useRef<Map<string, string>>(new Map());

  const storySample = SAMPLE_TEMPLATES[0].text;
  const demoSegments = analyzeScriptEmotionsLocally(storySample, "story");

  useEffect(() => {
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

  const playDemoMp3 = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    demoAudioRef.current = audio;
    setIsDemoPlaying(true);

    audio.ontimeupdate = () => {
      if (!audio.duration || demoSegments.length === 0) return;
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

  const handleToggleDemo = async () => {
    if (isDemoPlaying) {
      stopDemoAudio();
      return;
    }

    const cached = demoCacheRef.current.get(demoAccent);
    if (cached) {
      playDemoMp3(cached);
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
        demoCacheRef.current.set(demoAccent, data.audioUrl);
        playDemoMp3(data.audioUrl);
        return;
      }
    } catch {
      // Fallback below
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

  const orderedPlans: PlanId[] = ["free", "pro", "enterprise"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto w-full px-6 py-16 md:py-24 space-y-28">
        {/* Hero Split Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-xs font-medium text-violet-400 tracking-wide">
              Regional Accents · Dynamic Story Emotions · Account Quotas
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08] [text-wrap:balance]">
              Turn any script into human, multi-emotion speech.
            </h1>

            <p className="text-base text-slate-400 leading-relaxed max-w-xl">
              Choose US, UK, Australian, Canadian, or South Asian accents. In Story Mode, Echo Clone detects anger, laughter, humor, and sadness sentence by sentence so every line lands with natural human delivery.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/studio/tts"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span>Open Voice Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                View Packages
              </Link>
              {!isInstalled && installPrompt && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> Install App
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/80">
              <div>
                <p className="text-2xl font-bold text-white font-mono tabular-nums">6</p>
                <p className="text-xs text-slate-400 mt-0.5">Country Accents</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono tabular-nums">7</p>
                <p className="text-xs text-slate-400 mt-0.5">Dynamic Emotions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono tabular-nums">MP3</p>
                <p className="text-xs text-slate-400 mt-0.5">Studio Export</p>
              </div>
            </div>
          </div>

          {/* Interactive Live Multi-Emotion Story Demo */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Live Multi-Emotion Story Preview
                  </h2>
                  <p className="text-xs text-slate-400">
                    Test how each sentence adapts its vocal emotion automatically
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDemo}
                  disabled={isDemoLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {isDemoLoading ? (
                    <>Loading Demo...</>
                  ) : isDemoPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Stop Preview
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Play Story Demo
                    </>
                  )}
                </button>
              </div>

              {/* Country Accent Segmented Selector */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
                {COUNTRY_ACCENTS.slice(0, 4).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setDemoAccent(acc.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      demoAccent === acc.id
                        ? "bg-slate-800 text-white"
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
                          ? "border-violet-500 bg-slate-800/80"
                          : "border-slate-800/80 bg-slate-950/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-mono text-slate-500">
                          Sentence 0{idx + 1}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded border ${emo.colorClass}`}
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
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Want to write your own script?</span>
              <Link
                href="/studio/tts"
                className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
              >
                Open Full Studio <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section className="space-y-10">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Built for storytellers, creators, and teams
            </h2>
            <p className="text-sm text-slate-400">
              Every module is wired end-to-end—from regional voice acting to real-time package quotas and audio archiving.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-violet-400 flex items-center justify-center">
                <Globe2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                01. Country Accent Control
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Switch effortlessly between US, UK, Australian, Canadian, South Asian English, and Urdu-English bilingual delivery.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-sky-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                02. Multi-Emotion Story Director
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatic sentence-level emotion tagging adjusts vocal tension for angry arguments, genuine laughs, jokes, and sad moments—or tweak any line manually.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                03. Synced Accounts & Expiry Alerts
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every user account tracks its active package, monthly character limit, unlocked features, and sends instant alerts before or when a plan expires.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="space-y-10 scroll-mt-24">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Packages tailored to your production scale
            </h2>
            <p className="text-sm text-slate-400">
              Start free with 10,000 monthly characters, or upgrade to unlock all country accents and dynamic multi-emotion story narration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {orderedPlans.map((planKey) => {
              const plan = PLANS[planKey];
              const isHighlighted = plan.id === "pro";

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-7 flex flex-col justify-between space-y-6 ${
                    isHighlighted
                      ? "border-violet-500/70 bg-slate-900/90"
                      : "border-slate-800 bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                        {isHighlighted && (
                          <span className="text-xs font-semibold text-violet-400">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{plan.tagline}</p>
                    </div>

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-4xl font-extrabold text-white font-mono tabular-nums">
                        {plan.priceDisplayUsd}
                      </span>
                      <span className="text-xs text-slate-400">
                        / {plan.validityDays} days · {plan.pricePkr}
                      </span>
                    </div>

                    <ul className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      {plan.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-300"
                        >
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/checkout?plan=${plan.id}`}
                    className={`w-full py-2.5 px-4 rounded-lg text-center text-xs font-semibold transition-colors ${
                      isHighlighted
                        ? "bg-violet-600 hover:bg-violet-500 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-100"
                    }`}
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
            <p className="text-sm text-slate-400">
              Clear answers about regional accents, multi-emotion storytelling, MP3 exports, and synced creator plans.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AEO_FAQS.map((item, idx) => (
              <article
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-2"
              >
                <h3 className="text-sm font-bold text-white leading-snug">
                  {item.question}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Image
              src="/echo-icon-192.png"
              alt="Echo Clone Logo"
              width={24}
              height={24}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-md border border-violet-500/30 object-cover"
            />
            <span>© 2026 Echo Clone. Built by ABM.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/studio/tts" className="hover:text-slate-300 transition-colors">
              Studio
            </Link>
            <Link href="/library" className="hover:text-slate-300 transition-colors">
              Library
            </Link>
            <Link href="/checkout" className="hover:text-slate-300 transition-colors">
              Packages
            </Link>
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}