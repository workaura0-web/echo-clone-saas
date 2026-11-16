"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  auth,
  ensureUserProfile,
  subscribeUserProfile,
  trackCharacterUsage,
  UserProfile,
} from "@/lib/firebase/auth";
import {
  saveGenerationRecord,
  syncUserLifecycleNotifications,
} from "@/lib/firebase/db";
import { cacheAudioClip } from "@/lib/audio/audioCache";
import {
  computePackageStatus,
  getPlanDefinition,
} from "@/lib/plans";
import {
  COUNTRY_ACCENTS,
  DELIVERY_TONES,
  EMOTION_PROFILES,
  EmotionType,
  SAMPLE_TEMPLATES,
  VOICES,
  VoicePersona,
} from "@/lib/audio/accentsAndVoices";
import {
  analyzeScriptEmotionsLocally,
  AnalyzedSegment,
  speakSegmentsExpressively,
  speakSingleText,
  stopSpeaking,
} from "@/lib/audio/speechSynth";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  FileText,
  Globe2,
  Lock,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

const EMOTION_OPTIONS: EmotionType[] = [
  "calm",
  "angry",
  "laughing",
  "humorous",
  "sad",
  "excited",
  "whispering",
];

export default function TTSStudio() {
  const router = useRouter();

  // Auth & Package State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Studio Voice, Accent, Tone Controls
  const [selectedAccent, setSelectedAccent] = useState(COUNTRY_ACCENTS[0].id);
  const [selectedTone, setSelectedTone] = useState("professional");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // Script & Prosody
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);

  // Sentence Emotion Timeline
  const [segments, setSegments] = useState<AnalyzedSegment[]>([]);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState<number | null>(null);

  // Playback & Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioEngine, setAudioEngine] = useState<"gemini-tts" | "web-speech-fallback">("gemini-tts");
  const [isDownloading, setIsDownloading] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewCacheRef = useRef<Map<string, string>>(new Map());
  const stopFallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (currentUser) {
        setUser(currentUser);
        const prof = await ensureUserProfile(currentUser);
        setProfile(prof);
        await syncUserLifecycleNotifications(prof);

        // Unlock story mode by default for Pro/Enterprise/Admin
        const pDef = getPlanDefinition(prof.plan);
        if (pDef.storyEmotionEnabled || prof.isAdmin) {
          setSelectedTone("story");
        }

        unsubProfile = subscribeUserProfile(currentUser, (updated) => {
          setProfile(updated);
          syncUserLifecycleNotifications(updated);
        });
      } else {
        setUser(null);
        setProfile(null);
      }
      setAuthReady(true);
    });

    return () => {
      stopSpeaking();
      stopFallbackRef.current?.();
      if (previewAudioRef.current) previewAudioRef.current.pause();
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Re-analyze local emotions smoothly when user edits script in Story/Dramatic mode
  useEffect(() => {
    if (!text.trim()) {
      setSegments([]);
      return;
    }
    setSegments(analyzeScriptEmotionsLocally(text, selectedTone));
  }, [text, selectedTone]);

  const planDef = getPlanDefinition(profile?.plan);
  const pkgStatus = computePackageStatus(profile);
  const isPaidUnlocked = Boolean(profile?.isAdmin || planDef.storyEmotionEnabled);

  const maxCharsAllowed = profile
    ? Math.min(
        profile.isAdmin ? 15000 : profile.maxCharsPerGeneration || planDef.maxCharsPerGeneration,
        pkgStatus.remainingCharacters
      )
    : 1500;

  const currentVoice: VoicePersona =
    VOICES.find((v) => v.id === selectedVoice) || VOICES[0];
  const currentAccent =
    COUNTRY_ACCENTS.find((a) => a.id === selectedAccent) || COUNTRY_ACCENTS[0];
  const currentTone =
    DELIVERY_TONES.find((t) => t.id === selectedTone) || DELIVERY_TONES[0];

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(2, Math.ceil(wordCount / (2.4 * speed)));

  const handleSelectAccent = (accentId: string) => {
    const acc = COUNTRY_ACCENTS.find((a) => a.id === accentId);
    if (!acc) return;
    if (acc.proOnly && !profile?.isAdmin && !planDef.allowedAccents.includes(acc.id)) {
      setNotice({
        type: "warning",
        text: `${acc.label} requires Creator Pro or Studio Enterprise. Upgrade your package to unlock all country accents.`,
      });
      return;
    }
    setSelectedAccent(accentId);
    setNotice(null);
  };

  const handleSelectTone = (toneId: string) => {
    const tone = DELIVERY_TONES.find((t) => t.id === toneId);
    if (!tone) return;
    if (tone.proOnly && !isPaidUnlocked) {
      setNotice({
        type: "warning",
        text: `${tone.label} is included in Creator Pro and Studio Enterprise packages.`,
      });
      return;
    }
    setSelectedTone(toneId);
    setNotice(null);
  };

  const handlePreviewVoice = async (e: React.MouseEvent, voiceItem: VoicePersona) => {
    e.stopPropagation();

    if (previewingVoiceId === voiceItem.id) {
      stopSpeaking();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setPreviewingVoiceId(null);
      return;
    }

    stopSpeaking();
    stopFallbackRef.current?.();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setPreviewingVoiceId(voiceItem.id);

    const cacheKey = `${voiceItem.id}:${selectedAccent}:${pitch.toFixed(1)}:${speed.toFixed(1)}`;
    const cachedSample = previewCacheRef.current.get(cacheKey);
    if (cachedSample) {
      const audio = new Audio(cachedSample);
      previewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoiceId(null);
      audio.onerror = () => setPreviewingVoiceId(null);
      audio.play().catch(() => setPreviewingVoiceId(null));
      return;
    }

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceItem.sample,
          voiceId: voiceItem.id,
          accentId: selectedAccent,
          toneId: selectedTone,
          speed,
          pitch,
          isPreview: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.engine === "gemini-tts" && data.audioUrl) {
        previewCacheRef.current.set(cacheKey, data.audioUrl);
        const audio = new Audio(data.audioUrl);
        previewAudioRef.current = audio;
        audio.onended = () => setPreviewingVoiceId(null);
        audio.onerror = () => setPreviewingVoiceId(null);
        await audio.play();
        return;
      }
    } catch {
      // Fall back cleanly to expressive browser speech
    }

    speakSingleText(voiceItem.sample, voiceItem, {
      accentId: selectedAccent,
      pitch,
      rate: speed,
      onStart: () => setPreviewingVoiceId(voiceItem.id),
      onEnd: () => setPreviewingVoiceId(null),
      onError: () => setPreviewingVoiceId(null),
    });
  };

  const handleSegmentEmotionChange = (idx: number, newEmotion: EmotionType) => {
    setSegments((prev) =>
      prev.map((seg, i) => (i === idx ? { ...seg, emotion: newEmotion } : seg))
    );
  };

  const handleApplyTemplate = (tmpl: (typeof SAMPLE_TEMPLATES)[0]) => {
    const canUseTone =
      !DELIVERY_TONES.find((t) => t.id === tmpl.toneId)?.proOnly || isPaidUnlocked;
    if (canUseTone) {
      setSelectedTone(tmpl.toneId);
    }
    setTitle(tmpl.label);
    setText(tmpl.text.slice(0, Math.max(500, maxCharsAllowed)));
    setNotice(null);
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setNotice({ type: "error", text: "Please enter a script before generating audio." });
      return;
    }

    if (!user) {
      setNotice({
        type: "warning",
        text: "Please sign in to sync your package quota and save audio to your Library.",
      });
      router.push("/login");
      return;
    }

    if (!pkgStatus.canGenerate) {
      setNotice({
        type: "error",
        text: pkgStatus.blockReason || "Your package cannot generate right now.",
      });
      return;
    }

    if (text.length > (profile?.maxCharsPerGeneration || planDef.maxCharsPerGeneration) && !profile?.isAdmin) {
      setNotice({
        type: "error",
        text: `Single script limit for ${planDef.name} is ${planDef.maxCharsPerGeneration.toLocaleString()} characters.`,
      });
      return;
    }

    if (text.length > pkgStatus.remainingCharacters && !profile?.isAdmin) {
      setNotice({
        type: "error",
        text: `Not enough remaining characters (${pkgStatus.remainingCharacters.toLocaleString()} left). Please upgrade or shorten your script.`,
      });
      return;
    }

    setIsGenerating(true);
    setNotice(null);
    setPreviewingVoiceId(null);
    stopSpeaking();
    stopFallbackRef.current?.();
    setIsPlaying(false);
    setActiveSegmentIdx(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: currentVoice.id,
          accentId: currentAccent.id,
          toneId: currentTone.id,
          speed,
          pitch,
          customSegments: segments.length > 0 ? segments : undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Audio generation failed");
      }

      const finalSegments: AnalyzedSegment[] =
        Array.isArray(result.segments) && result.segments.length > 0
          ? result.segments
          : segments;
      setSegments(finalSegments);

      let finalAudioUrl: string | null = null;
      const engineUsed: "gemini-tts" | "web-speech-fallback" =
        result.engine === "gemini-tts" && result.audioUrl
          ? "gemini-tts"
          : "web-speech-fallback";

      setAudioEngine(engineUsed);

      if (engineUsed === "gemini-tts" && result.audioUrl) {
        finalAudioUrl = result.audioUrl;
        setAudioUrl(finalAudioUrl);
        setHasAudio(true);

        // Auto-play neural WAV output cleanly
        setTimeout(() => {
          if (audioRef.current && finalAudioUrl) {
            audioRef.current.src = finalAudioUrl;
            audioRef.current.play().catch(() => undefined);
          }
        }, 80);
      } else {
        // Multi-segment expressive Speech playback (no fake sine-wave WAV saved)
        setAudioUrl(null);
        setHasAudio(true);
        setIsPlaying(true);

        stopFallbackRef.current = speakSegmentsExpressively(finalSegments, currentVoice, {
          accentId: currentAccent.id,
          basePitch: pitch,
          baseRate: speed,
          onSegmentStart: (idx) => setActiveSegmentIdx(idx),
          onComplete: () => {
            setIsPlaying(false);
            setActiveSegmentIdx(null);
          },
          onError: () => {
            setIsPlaying(false);
            setActiveSegmentIdx(null);
          },
        });
      }

      // Track character quota in Firestore & save to Library
      await trackCharacterUsage(user.uid, text.length);

      const saved = await saveGenerationRecord({
        userId: user.uid,
        title: title.trim() || `${currentVoice.name} · ${currentTone.label}`,
        text,
        voiceId: currentVoice.id,
        voiceName: currentVoice.name,
        accentId: currentAccent.id,
        accentLabel: currentAccent.label,
        toneId: currentTone.id,
        toneLabel: currentTone.label,
        engine: engineUsed,
        durationSeconds: result.durationSeconds || estimatedSeconds,
        characterCount: text.length,
        segmentsJson: JSON.stringify(finalSegments),
      });

      if (finalAudioUrl) {
        await cacheAudioClip(saved.id, finalAudioUrl);
      }

      if (profile) {
        const updatedProfile = {
          ...profile,
          usedCharacters: (profile.usedCharacters || 0) + text.length,
        };
        await syncUserLifecycleNotifications(updatedProfile);
      }

      setNotice({
        type: "success",
        text:
          engineUsed === "gemini-tts"
            ? "Neural multi-emotion WAV audio generated and saved to your Library."
            : "Expressive segmented speech generated and saved to your Library.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Audio generation failed.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePlay = () => {
    if (audioEngine === "gemini-tts" && audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => undefined);
      }
      return;
    }

    if (isPlaying) {
      stopFallbackRef.current?.();
      stopSpeaking();
      setIsPlaying(false);
      setActiveSegmentIdx(null);
    } else {
      const segs =
        segments.length > 0
          ? segments
          : analyzeScriptEmotionsLocally(text, selectedTone);
      setIsPlaying(true);
      stopFallbackRef.current = speakSegmentsExpressively(segs, currentVoice, {
        accentId: currentAccent.id,
        basePitch: pitch,
        baseRate: speed,
        onSegmentStart: (idx) => setActiveSegmentIdx(idx),
        onComplete: () => {
          setIsPlaying(false);
          setActiveSegmentIdx(null);
        },
        onError: () => {
          setIsPlaying(false);
          setActiveSegmentIdx(null);
        },
      });
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    try {
      setIsDownloading(true);
      const a = document.createElement("a");
      a.href = audioUrl;
      const safeName = (title.trim() || currentVoice.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
      a.download = `${safeName}_${currentAccent.code.toLowerCase()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    stopSpeaking();
    stopFallbackRef.current?.();
    if (audioRef.current) audioRef.current.pause();
    setTitle("");
    setText("");
    setSegments([]);
    setAudioUrl(null);
    setHasAudio(false);
    setIsPlaying(false);
    setActiveSegmentIdx(null);
    setNotice(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Package Synced Status Bar */}
        {authReady && (
          <div
            className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              !user
                ? "border-slate-800 bg-slate-900/70"
                : !pkgStatus.canGenerate
                ? "border-rose-500/50 bg-rose-950/30"
                : pkgStatus.isExpiringSoon || pkgStatus.isQuotaLow
                ? "border-amber-500/40 bg-amber-950/20"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            {!user ? (
              <>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-white">
                    Sign in to sync your package quota & save audio to Library
                  </p>
                  <p className="text-xs text-slate-400">
                    New accounts start with Starter Free (10,000 characters / 30 days).
                  </p>
                </div>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
                >
                  Sign In / Create Account
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {!pkgStatus.canGenerate ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                    ) : profile?.isAdmin ? (
                      <Crown className="w-5 h-5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-white text-sm">
                        {profile?.isAdmin ? "Admin Studio Access" : planDef.name}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {pkgStatus.remainingCharacters.toLocaleString()} /{" "}
                        {(profile?.characterLimit || planDef.characterLimit).toLocaleString()} chars remaining
                      </span>
                      {!profile?.isAdmin && (
                        <>
                          <span className="text-slate-500">·</span>
                          <span className="font-mono tabular-nums text-slate-400">
                            {pkgStatus.isExpired
                              ? "Expired"
                              : `${pkgStatus.daysRemaining} days left`}
                          </span>
                        </>
                      )}
                    </div>
                    {pkgStatus.blockReason ? (
                      <p className="text-xs text-rose-300">{pkgStatus.blockReason}</p>
                    ) : pkgStatus.isExpiringSoon || pkgStatus.isQuotaLow ? (
                      <p className="text-xs text-amber-300">
                        Your package is nearing its limit or renewal date.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        {isPaidUnlocked
                          ? "All 6 country accents and Dynamic Story Multi-Emotion engine unlocked."
                          : "Starter tier active (US/UK accents). Upgrade to Creator Pro for all accents & Story Multi-Emotion."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    href="/library"
                    className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap"
                  >
                    Audio Library
                  </Link>
                  {(!isPaidUnlocked || !pkgStatus.canGenerate || pkgStatus.isExpiringSoon) && (
                    <Link
                      href="/checkout?plan=pro"
                      className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      {pkgStatus.isExpired || pkgStatus.isQuotaExhausted ? "Renew / Upgrade" : "Upgrade to Pro"}
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Notice Banner */}
        {notice && (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between gap-4 ${
              notice.type === "error"
                ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                : notice.type === "warning"
                ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
                : "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
            }`}
          >
            <span>{notice.text}</span>
            <div className="flex items-center gap-3 shrink-0">
              {notice.type === "warning" && (
                <Link href="/checkout?plan=pro" className="underline font-semibold">
                  View Packages
                </Link>
              )}
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Studio Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Country Accent, Delivery Tone & Voice Personas */}
          <div className="lg:col-span-5 space-y-5">
            {/* Country Accent Selector */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-violet-400" />
                  Country & Regional Accent
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  {currentAccent.code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {COUNTRY_ACCENTS.map((acc) => {
                  const locked =
                    acc.proOnly &&
                    user &&
                    !profile?.isAdmin &&
                    !planDef.allowedAccents.includes(acc.id);
                  const active = selectedAccent === acc.id;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectAccent(acc.id)}
                      className={`p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 ${
                        active
                          ? "border-violet-500 bg-violet-600/15 text-white"
                          : locked
                          ? "border-slate-800/70 bg-slate-950/50 text-slate-500 hover:border-slate-700"
                          : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{acc.country}</p>
                        <p className="text-[11px] text-slate-400 truncate">{acc.code}</p>
                      </div>
                      {locked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Tone Selector */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Delivery Tone & Performance
                </h2>
              </div>

              <div className="space-y-2">
                {DELIVERY_TONES.map((tone) => {
                  const locked = tone.proOnly && user && !isPaidUnlocked;
                  const active = selectedTone === tone.id;

                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => handleSelectTone(tone.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors flex items-start justify-between gap-3 ${
                        active
                          ? "border-violet-500 bg-violet-600/15"
                          : locked
                          ? "border-slate-800/60 bg-slate-950/40 text-slate-500 hover:border-slate-700"
                          : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold ${active ? "text-white" : "text-slate-200"}`}>
                          {tone.label}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {tone.description}
                        </p>
                      </div>
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 shrink-0 mt-0.5">
                          <Lock className="w-3 h-3" /> Pro
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Personas */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Voice Persona
                </h2>
                <span className="text-[11px] text-slate-400">
                  {VOICES.length} Voices
                </span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {VOICES.map((voice) => {
                  const isSelected = selectedVoice === voice.id;
                  const isPreviewing = previewingVoiceId === voice.id;
                  return (
                    <div
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-violet-500 bg-slate-800/80"
                          : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {voice.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-white">{voice.name}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">{voice.gender}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {voice.style}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handlePreviewVoice(e, voice)}
                        className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                          isPreviewing
                            ? "border-violet-500 bg-violet-600 text-white"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
                        }`}
                      >
                        {isPreviewing ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" /> Stop
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" /> Preview
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Script Editor, Emotion Breakdown, Controls & Player */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-5">
              {/* Sample Script Presets */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                    Sample Scripts:
                  </span>
                  {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-2.5 py-1 rounded-md border border-slate-800 bg-slate-950 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Clip Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project or Scene Title (optional, e.g. Chapter 1 Dialogue)"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />

              {/* Main Script Textarea */}
              <div className="space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write or paste your story, speech, or commercial script here... In Story Mode, angry, laughing, humorous, and sad sentences are automatically directed!"
                  rows={7}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-y leading-relaxed"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums px-1">
                  <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" /> ~{estimatedSeconds}s
                    </span>
                  </div>
                  <span
                    className={
                      text.length > (profile?.maxCharsPerGeneration || planDef.maxCharsPerGeneration) &&
                      !profile?.isAdmin
                        ? "text-rose-400 font-semibold"
                        : "text-slate-400"
                    }
                  >
                    {text.length.toLocaleString()} /{" "}
                    {(profile?.isAdmin
                      ? 15000
                      : profile?.maxCharsPerGeneration || planDef.maxCharsPerGeneration
                    ).toLocaleString()}{" "}
                    chars
                  </span>
                </div>
              </div>

              {/* Speed & Pitch Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-violet-400" /> Speaking Speed
                    </span>
                    <span className="font-mono tabular-nums text-white font-semibold">
                      {speed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.6"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> Vocal Pitch
                    </span>
                    <span className="font-mono tabular-nums text-white font-semibold">
                      {pitch.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className={`px-6 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                    isGenerating || !text.trim()
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-violet-600 hover:bg-violet-500 text-white"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Directing & Synthesizing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" /> Generate Audio
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Audio Player Box */}
            {hasAudio && (
              <div className="rounded-xl border border-violet-500/40 bg-slate-900/80 p-5 space-y-4">
                <audio
                  ref={audioRef}
                  src={audioEngine === "gemini-tts" ? audioUrl ?? undefined : undefined}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  controls={audioEngine === "gemini-tts"}
                  className={audioEngine === "gemini-tts" ? "w-full h-10" : "hidden"}
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white transition-colors shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      )}
                    </button>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {title.trim() || `${currentVoice.name} (${currentAccent.code})`}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {currentTone.label} · {currentAccent.country} ·{" "}
                        {audioEngine === "gemini-tts" ? "Neural HD WAV" : "Expressive Browser Voice"}
                      </p>
                    </div>
                  </div>

                  {audioUrl ? (
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      {isDownloading ? "Preparing..." : "Download WAV"}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-[11px] text-slate-400">
                      Live Browser Speech Playback
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Sentence-by-Sentence Emotion Breakdown Panel */}
            {segments.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Sentence Emotion Director ({segments.length} Lines)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Each sentence automatically switches vocal emotion. You can fine-tune any line below before regenerating.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {segments.map((seg, idx) => {
                    const emo = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
                    const isLineActive = activeSegmentIdx === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isLineActive
                            ? "border-violet-500 bg-violet-950/30"
                            : "border-slate-800 bg-slate-950/50"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-slate-500">
                            Line {String(idx + 1).padStart(2, "0")}
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {seg.text}
                          </p>
                        </div>

                        <select
                          value={seg.emotion}
                          onChange={(e) =>
                            handleSegmentEmotionChange(idx, e.target.value as EmotionType)
                          }
                          aria-label={`Emotion for line ${idx + 1}`}
                          className={`text-xs font-medium rounded-md border px-2.5 py-1.5 shrink-0 focus:outline-none ${emo.colorClass}`}
                        >
                          {EMOTION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-slate-900 text-slate-100">
                              {EMOTION_PROFILES[opt].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}