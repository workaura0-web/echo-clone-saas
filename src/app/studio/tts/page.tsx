"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logOut, trackCharacterUsage } from "@/lib/firebase/auth";
import {
  GenerationRecord,
  getUserGenerations,
  saveGenerationRecord,
  syncUserLifecycleNotifications,
} from "@/lib/firebase/db";
import { useAppState } from "@/components/app-state-provider";
import { CountryFlag } from "@/components/country-flag";
import { LanguageDropdown } from "@/components/language-dropdown";
import {
  analyzeAudioAcousticsClient,
  AnalyzedReferenceProfile,
  blobToBase64Data,
} from "@/lib/audio/analyzeClientAudio";
import { cacheAudioClip, getCachedAudioClip } from "@/lib/audio/audioCache";
import { downloadAudioAsMp3 } from "@/lib/audio/downloadMp3";
import { computePackageStatus, getPlanDefinition } from "@/lib/plans";
import {
  COUNTRY_ACCENTS,
  DELIVERY_TONES,
  detectLanguageLocale,
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
import type { GlobalNeuralVoice } from "@/lib/audio/globalVoices";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Download,
  FileText,
  Globe2,
  Lock,
  LogOut,
  Mic,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
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

interface CustomVoiceReference {
  name: string;
  referenceText: string;
  gender: "Male" | "Female";
  pitchOffset: number;
  audioUrl?: string;
  analysis?: AnalyzedReferenceProfile;
}

export default function TTSStudio() {
  const router = useRouter();

  // Shared Auth, Live Plans & Global 300+ Voices Directory
  const {
    user,
    authReady,
    profile,
    livePlansMap,
    globalVoices,
    globalLocales,
    voicesLoading,
    ensureGlobalVoices,
  } = useAppState();
  const [showGlobalLibrary, setShowGlobalLibrary] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"languages" | "voices">("languages");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"All" | "Male" | "Female">("All");
  const [selectedCustomEdgeVoice, setSelectedCustomEdgeVoice] = useState<GlobalNeuralVoice | null>(null);
  const [openEmotionIdx, setOpenEmotionIdx] = useState<number | null>(null);

  // Studio Voice, Accent, Tone Controls
  const [selectedAccent, setSelectedAccent] = useState("auto");
  const [selectedTone, setSelectedTone] = useState("story");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // Reference Audio / Voice Cloning Profile Panel
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [customRef, setCustomRef] = useState<CustomVoiceReference | null>(null);
  const [useReferenceVoice, setUseReferenceVoice] = useState(false);
  const [analyzingRef, setAnalyzingRef] = useState(false);
  const [refText, setRefText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Script & Advanced Prosody Controls
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [qualitySteps, setQualitySteps] = useState(32);
  const [removeSilences, setRemoveSilences] = useState(false);
  const [randomizeSeed, setRandomizeSeed] = useState(true);
  const [fixedSeed, setFixedSeed] = useState(42);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sentence Emotion Timeline
  const [segments, setSegments] = useState<AnalyzedSegment[]>([]);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState<number | null>(null);

  // Playback, Recent 24h & Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioEngine, setAudioEngine] = useState<"neural-mp3" | "gemini-tts" | "web-speech-fallback">("neural-mp3");
  const [resolvedVoiceUsed, setResolvedVoiceUsed] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [recentClips, setRecentClips] = useState<GenerationRecord[]>([]);
  const [notice, setNotice] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewCacheRef = useRef<Map<string, string>>(new Map());
  const stopFallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    ensureGlobalVoices();

    return () => {
      stopSpeaking();
      stopFallbackRef.current?.();
      if (previewAudioRef.current) previewAudioRef.current.pause();
    };
  }, [ensureGlobalVoices]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setRecentClips([]);
      router.replace("/login?next=/studio/tts&reason=studio_auth");
      return;
    }

    let cancelled = false;
    getUserGenerations(user.uid)
      .then((items) => {
        if (!cancelled) setRecentClips(items.slice(0, 6));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [authReady, user, router]);

  useEffect(() => {
    if (!text.trim()) {
      setSegments([]);
      return;
    }
    setSegments(analyzeScriptEmotionsLocally(text, selectedTone));
  }, [text, selectedTone]);

  const planDef = getPlanDefinition(profile?.plan, livePlansMap);
  const pkgStatus = computePackageStatus(profile);

  const detectedInfo = useMemo(() => {
    if (selectedAccent !== "auto") return null;
    return detectLanguageLocale(text);
  }, [selectedAccent, text]);

  const maxCharsAllowed = profile
    ? Math.min(
        profile.isAdmin ? 100000 : profile.maxCharsPerGeneration || planDef.maxCharsPerGeneration,
        pkgStatus.remainingCharacters
      )
    : 3000;

  const currentVoice: VoicePersona =
    VOICES.find((v) => v.id === selectedVoice) || VOICES[0];
  const currentAccentObj = COUNTRY_ACCENTS.find((a) => a.id === selectedAccent);
  const currentAccentLabel =
    selectedCustomEdgeVoice
      ? selectedCustomEdgeVoice.localeName
      : selectedAccent === "auto"
      ? `Auto · ${detectedInfo?.label || "English"}`
      : currentAccentObj?.label ||
        globalLocales.find((l) => l.locale === selectedAccent)?.localeName ||
        selectedAccent;

  const currentTone =
    DELIVERY_TONES.find((t) => t.id === selectedTone) || DELIVERY_TONES[0];

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(2, Math.ceil(wordCount / (2.4 * speed)));
  const estimatedCreditsCost = text.length;

  const localeVoiceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of globalVoices) {
      counts.set(v.locale, (counts.get(v.locale) || 0) + 1);
    }
    return counts;
  }, [globalVoices]);

  const filteredGlobalLocales = useMemo(() => {
    const q = voiceSearch.trim().toLowerCase();
    if (!q) return globalLocales;
    return globalLocales.filter(
      (loc) =>
        loc.localeName.toLowerCase().includes(q) ||
        loc.locale.toLowerCase().includes(q)
    );
  }, [globalLocales, voiceSearch]);

  const filteredGlobalVoices = useMemo(() => {
    const q = voiceSearch.trim().toLowerCase();
    return globalVoices.filter((v) => {
      const matchesGender = genderFilter === "All" || v.gender === genderFilter;
      const matchesQuery =
        !q ||
        v.displayName.toLowerCase().includes(q) ||
        v.localeName.toLowerCase().includes(q) ||
        v.locale.toLowerCase().includes(q) ||
        v.personalities.some((p) => p.toLowerCase().includes(q));
      return matchesGender && matchesQuery;
    });
  }, [globalVoices, voiceSearch, genderFilter]);

  const handleUploadScriptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setText(reader.result);
        if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const analyzeAndAttachReferenceAudio = async (blob: Blob, clipName: string) => {
    const url = URL.createObjectURL(blob);
    setShowRefPanel(true);
    setAnalyzingRef(true);

    const localAnalysis = await analyzeAudioAcousticsClient(blob);
    setCustomRef({
      name: clipName,
      referenceText: refText,
      gender: localAnalysis.gender,
      pitchOffset: localAnalysis.pitchMultiplier,
      audioUrl: url,
      analysis: localAnalysis,
    });

    if (user) {
      try {
        const [audioBase64, idToken] = await Promise.all([
          blobToBase64Data(blob),
          user.getIdToken(),
        ]);
        const res = await fetch("/api/tts/analyze-reference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            audioBase64,
            mimeType: blob.type || "audio/webm",
          }),
        });
        const data = await res.json();
        if (res.ok && data?.success && data?.profile) {
          const geminiAnalysis: AnalyzedReferenceProfile = {
            ...data.profile,
            estimatedHz: localAnalysis.estimatedHz,
          };
          setCustomRef((prev) =>
            prev
              ? {
                  ...prev,
                  gender: geminiAnalysis.gender,
                  pitchOffset: geminiAnalysis.pitchMultiplier,
                  analysis: geminiAnalysis,
                }
              : prev
          );
        }
      } catch {
        // Keep client acoustic analysis seamlessly
      }
    }

    setAnalyzingRef(false);
    setNotice({
      type: "success",
      text: `Reference "${clipName}" analyzed. Click "Select This Voice" to generate speech using its vocal tone & pitch.`,
    });
  };

  const handleUploadRefAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const clipName = file.name.replace(/\.[^.]+$/, "");
    void analyzeAndAttachReferenceAudio(file, clipName);
    e.target.value = "";
  };

  const handleToggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        void analyzeAndAttachReferenceAudio(blob, "Mic Voice Reference");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setNotice({
        type: "error",
        text: "Microphone permission was denied or unavailable in this browser.",
      });
    }
  };

  const handlePreviewVoice = async (
    e: React.MouseEvent,
    voiceItem: VoicePersona,
    overrideEdgeVoice?: GlobalNeuralVoice
  ) => {
    e.stopPropagation();
    if (!user) {
      router.replace("/login?next=/studio/tts&reason=studio_auth");
      return;
    }

    const previewKey = overrideEdgeVoice ? overrideEdgeVoice.shortName : voiceItem.id;

    if (previewingVoiceId === previewKey) {
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
    setPreviewingVoiceId(previewKey);

    const localeToUse = overrideEdgeVoice
      ? overrideEdgeVoice.locale
      : selectedAccent === "auto"
      ? "en-US"
      : selectedAccent;
    const sampleText = overrideEdgeVoice
      ? `Hello, I am ${overrideEdgeVoice.displayName}. Ready to voice your scripts with studio clarity.`
      : voiceItem.sample;

    const cacheKey = `${previewKey}:${localeToUse}:${pitch.toFixed(1)}:${speed.toFixed(1)}`;
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
      const idToken = await user.getIdToken();
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          text: sampleText,
          voiceId: voiceItem.id,
          accentId: localeToUse,
          toneId: selectedTone,
          customEdgeVoice: overrideEdgeVoice?.shortName,
          speed,
          pitch,
          isPreview: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.audioUrl) {
        previewCacheRef.current.set(cacheKey, data.audioUrl);
        const audio = new Audio(data.audioUrl);
        previewAudioRef.current = audio;
        audio.onended = () => setPreviewingVoiceId(null);
        audio.onerror = () => setPreviewingVoiceId(null);
        await audio.play();
        return;
      }
    } catch {
      // Fallback
    }

    speakSingleText(sampleText, voiceItem, {
      accentId: localeToUse,
      pitch,
      rate: speed,
      onStart: () => setPreviewingVoiceId(previewKey),
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
    setSelectedTone(tmpl.toneId);
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
        text: "Please sign in to sync your package credits and save audio to your Library.",
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

    const perGenMax = profile?.isAdmin
      ? 100000
      : profile?.maxCharsPerGeneration || planDef.maxCharsPerGeneration;

    if (text.length > perGenMax && !profile?.isAdmin) {
      setNotice({
        type: "error",
        text: `Single script limit for ${planDef.name} is ${perGenMax.toLocaleString()} characters.`,
      });
      return;
    }

    if (text.length > pkgStatus.remainingCharacters && !profile?.isAdmin) {
      setNotice({
        type: "error",
        text: `Not enough remaining credits (${pkgStatus.remainingCharacters.toLocaleString()} left). Please upgrade or shorten your script.`,
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
      const idToken = await user.getIdToken();
      const activeReferenceProfile =
        useReferenceVoice && customRef
          ? {
              name: customRef.name,
              gender: customRef.analysis?.gender || customRef.gender,
              pitchMultiplier: customRef.analysis?.pitchMultiplier ?? 1.0,
              speakingRate: customRef.analysis?.speakingRate ?? 1.0,
              toneId: customRef.analysis?.toneId || currentTone.id,
              recommendedVoiceId: customRef.analysis?.recommendedVoiceId,
              recommendedGeminiVoice: customRef.analysis?.recommendedGeminiVoice,
              voiceStylePrompt: customRef.analysis?.voiceStylePrompt,
            }
          : undefined;

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          text,
          voiceId: currentVoice.id,
          accentId: selectedCustomEdgeVoice ? selectedCustomEdgeVoice.locale : selectedAccent,
          toneId: currentTone.id,
          customEdgeVoice: activeReferenceProfile ? undefined : selectedCustomEdgeVoice?.shortName,
          referenceVoiceProfile: activeReferenceProfile,
          speed,
          pitch,
          qualitySteps,
          removeSilences,
          seed: randomizeSeed ? undefined : fixedSeed,
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
      const engineUsed: "neural-mp3" | "gemini-tts" | "web-speech-fallback" = result.audioUrl
        ? result.engine === "gemini-tts"
          ? "gemini-tts"
          : "neural-mp3"
        : "web-speech-fallback";

      setAudioEngine(engineUsed);
      setResolvedVoiceUsed(result.resolvedNeuralVoice || null);

      if (engineUsed !== "web-speech-fallback" && result.audioUrl) {
        finalAudioUrl = result.audioUrl;
        setAudioUrl(finalAudioUrl);
        setHasAudio(true);

        setTimeout(() => {
          if (audioRef.current && finalAudioUrl) {
            audioRef.current.src = finalAudioUrl;
            audioRef.current.play().catch(() => undefined);
          }
        }, 80);
      } else {
        setAudioUrl(null);
        setHasAudio(true);
        setIsPlaying(true);

        stopFallbackRef.current = speakSegmentsExpressively(finalSegments, currentVoice, {
          accentId: result.detectedLocale || selectedAccent,
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

      await trackCharacterUsage(user.uid, text.length);

      const activeVoiceLabel = activeReferenceProfile
        ? `${customRef?.name || "Reference Voice"} (${activeReferenceProfile.gender})`
        : selectedCustomEdgeVoice
        ? `${selectedCustomEdgeVoice.displayName} (${selectedCustomEdgeVoice.gender})`
        : currentVoice.name;

      const saved = await saveGenerationRecord({
        userId: user.uid,
        title: title.trim() || `${activeVoiceLabel} · ${currentTone.label}`,
        text,
        voiceId: activeReferenceProfile?.recommendedVoiceId || selectedCustomEdgeVoice?.shortName || currentVoice.id,
        voiceName: activeVoiceLabel,
        accentId: result.detectedLocale || selectedAccent,
        accentLabel: result.accentLabel || currentAccentLabel,
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
      setRecentClips((prev) => [saved, ...prev].slice(0, 6));

      if (profile) {
        await syncUserLifecycleNotifications({
          ...profile,
          usedCharacters: (profile.usedCharacters || 0) + text.length,
        });
      }

      setNotice({
        type: "success",
        text:
          engineUsed !== "web-speech-fallback"
            ? `${activeVoiceLabel} neural MP3 generated (${result.accentLabel || currentAccentLabel}) and saved to Library.`
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
    if (audioEngine !== "web-speech-fallback" && audioRef.current && audioUrl) {
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
        segments.length > 0 ? segments : analyzeScriptEmotionsLocally(text, selectedTone);
      setIsPlaying(true);
      stopFallbackRef.current = speakSegmentsExpressively(segs, currentVoice, {
        accentId: detectedInfo?.locale || selectedAccent,
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

  const handlePlayRecentClip = async (clip: GenerationRecord) => {
    const cached = await getCachedAudioClip(clip.id);
    if (cached) {
      setAudioUrl(cached);
      setAudioEngine("neural-mp3");
      setHasAudio(true);
      setTitle(clip.title);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = cached;
          audioRef.current.play().catch(() => undefined);
        }
      }, 60);
      return;
    }
    router.push("/library");
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    try {
      setIsDownloading(true);
      const baseName = `${title.trim() || selectedCustomEdgeVoice?.displayName || currentVoice.name}_${(
        detectedInfo?.locale || selectedAccent
      ).toLowerCase()}`;
      await downloadAudioAsMp3(audioUrl, baseName);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopySummary = () => {
    const summary = `${title || "Echo Clone Audio"}\nVoice: ${
      selectedCustomEdgeVoice?.displayName || currentVoice.name
    }\nLanguage: ${currentAccentLabel}\n\n${text}`;
    navigator.clipboard.writeText(summary);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 1800);
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

  const handleStudioSignOut = async () => {
    stopSpeaking();
    stopFallbackRef.current?.();
    await logOut();
    router.replace("/login");
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Verifying studio account access...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
        <div className="max-w-md w-full rounded-3xl border border-indigo-200 dark:border-indigo-500/35 bg-white/95 dark:bg-[#0d1226]/90 p-8 text-center space-y-5 shadow-2xl shadow-indigo-500/10 dark:shadow-black/40">
          <div className="w-12 h-12 rounded-2xl mx-auto bg-gradient-to-br from-violet-100 to-cyan-100 dark:from-violet-500/25 dark:to-cyan-500/25 border border-cyan-300 dark:border-cyan-400/35 flex items-center justify-center text-cyan-700 dark:text-cyan-300">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Account Required for Studio Access
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Sign in or create a free Echo Clone account to unlock 140+ languages, 300+ neural voices, and unlimited MP3 synthesis.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?next=/studio/tts&reason=studio_auth"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 text-xs font-bold text-white shadow-md shadow-violet-600/20"
            >
              Sign In
            </Link>
            <Link
              href="/signup?next=/studio/tts"
              className="px-5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-400/35 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Package Synced Status Bar */}
        <div
          className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg shadow-indigo-500/10 dark:shadow-indigo-950/20 ${
            !pkgStatus.canGenerate
              ? "border-rose-300 dark:border-rose-500/50 bg-gradient-to-r from-rose-50 via-white to-slate-50 dark:from-rose-950/50 dark:via-slate-900/90 dark:to-slate-900/90"
              : pkgStatus.isExpiringSoon || pkgStatus.isQuotaLow
              ? "border-amber-300 dark:border-amber-500/45 bg-gradient-to-r from-amber-50 via-white to-slate-50 dark:from-amber-950/40 dark:via-slate-900/90 dark:to-slate-900/90"
              : "border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50/90 via-white to-indigo-50/80 dark:from-emerald-950/35 dark:via-[#0d1229] dark:to-indigo-950/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {!pkgStatus.canGenerate ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : profile?.isAdmin ? (
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {profile?.isAdmin ? "Admin Studio Access" : planDef.name}
                </span>
                {profile?.username && (
                  <span className="text-cyan-700 dark:text-cyan-300 font-mono">@{profile.username}</span>
                )}
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                  {pkgStatus.remainingCharacters.toLocaleString()} credits left
                </span>
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  of {(profile?.characterLimit || planDef.characterLimit).toLocaleString()}
                </span>
                {!profile?.isAdmin && (
                  <>
                    <span className="text-slate-400 dark:text-slate-500">·</span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {pkgStatus.isExpired ? "Expired" : `${pkgStatus.daysRemaining}d left`}
                    </span>
                  </>
                )}
              </div>
              {pkgStatus.blockReason ? (
                <p className="text-xs text-rose-700 dark:text-rose-300">{pkgStatus.blockReason}</p>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {globalLocales.length || 140}+ regional locales, {globalVoices.length || 300}+ neural voices, Auto-Detect & Story Emotion Director active.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/dashboard"
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/library"
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap transition-colors"
            >
              Audio Library
            </Link>
            <Link
              href="/checkout"
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:brightness-110 text-white text-xs font-semibold whitespace-nowrap shadow-sm shadow-violet-600/20"
            >
              {pkgStatus.isExpired || pkgStatus.isQuotaExhausted ? "Renew / Upgrade" : "Upgrade Credits"}
            </Link>
            <button
              type="button"
              onClick={handleStudioSignOut}
              className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-950/25 hover:bg-rose-100 dark:hover:bg-rose-950/45 text-xs font-medium text-rose-700 dark:text-rose-200 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between gap-4 ${
              notice.type === "error"
                ? "border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200"
                : notice.type === "warning"
                ? "border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
                : "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
            }`}
          >
            <span>{notice.text}</span>
            <div className="flex items-center gap-3 shrink-0">
              {notice.type === "warning" && (
                <Link href="/checkout" className="underline font-semibold">
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
          {/* Left Column: Language (Sky), Voice Library (Emerald), Reference Audio (Amber) & Tone (Violet) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Language & Accent Selector */}
            <div className="rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-gradient-to-b from-sky-50/80 via-white to-slate-50/70 dark:from-sky-950/35 dark:via-[#0d1328] dark:to-[#0a0f20] p-5 space-y-3 shadow-lg shadow-sky-500/10 dark:shadow-sky-950/20">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-400/30 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                    <Globe2 className="w-4 h-4" />
                  </span>
                  Language & Accent
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setLibraryTab("languages");
                    setShowGlobalLibrary(true);
                  }}
                  className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-200"
                >
                  Browse {globalLocales.length || 140}+ Languages →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {COUNTRY_ACCENTS.map((acc) => {
                  const active = !selectedCustomEdgeVoice && selectedAccent === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomEdgeVoice(null);
                        setSelectedAccent(acc.id);
                        setNotice(null);
                      }}
                      className={`relative overflow-hidden p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        active
                          ? "border-cyan-500 dark:border-cyan-400 ring-1 ring-cyan-500/35 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                          : "border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-950/70 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-500/40"
                      }`}
                    >
                      <CountryFlag
                        code={acc.code}
                        label={acc.country}
                        variant="backdrop"
                      />
                      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <CountryFlag
                          code={acc.code}
                          label={acc.country}
                          className="w-6 h-4 rounded-[4px]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                            {acc.country}
                          </p>
                          <p
                            className={`text-[11px] truncate font-medium ${
                              active
                                ? "text-cyan-700 dark:text-cyan-300"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {acc.id === "auto" && text.trim()
                              ? detectedInfo?.label
                              : acc.code}
                          </p>
                        </div>
                      </div>
                      {active && (
                        <Check className="relative z-10 w-3.5 h-3.5 text-cyan-600 dark:text-cyan-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {globalLocales.length > 0 && (
                <LanguageDropdown
                  value={
                    selectedCustomEdgeVoice
                      ? selectedCustomEdgeVoice.locale
                      : selectedAccent
                  }
                  locales={globalLocales}
                  autoDetectDetectedLabel={detectedInfo?.label}
                  onChange={(nextLocale) => {
                    setSelectedCustomEdgeVoice(null);
                    setSelectedAccent(nextLocale);
                    setNotice(null);
                  }}
                />
              )}
            </div>

            {/* Voice Personas + Global Library Trigger */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-b from-emerald-50/75 via-white to-slate-50/70 dark:from-emerald-950/30 dark:via-[#0d1328] dark:to-[#0a0f20] p-5 space-y-3 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-950/20">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-500/20 pb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </span>
                  Voice Selection
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setLibraryTab("voices");
                    setShowGlobalLibrary(true);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/35 bg-emerald-50 dark:bg-emerald-950/50 hover:border-emerald-400 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 transition-colors"
                >
                  {globalVoices.length || 300}+ Voice Library
                </button>
              </div>

              {useReferenceVoice && customRef && (
                <div className="p-3 rounded-xl border border-amber-400 dark:border-amber-400/70 bg-gradient-to-r from-amber-50 via-emerald-50/60 to-cyan-50 dark:from-amber-950/50 dark:via-emerald-950/35 dark:to-cyan-950/35 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      Active Reference Voice: {customRef.name}
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-200 truncate">
                      {customRef.analysis?.summaryBadge || `${customRef.gender} · Vocal Tone Matched`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseReferenceVoice(false)}
                    className="p-1 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    title="Switch back to preset voice"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!useReferenceVoice && selectedCustomEdgeVoice && (
                <div className="p-3 rounded-xl border border-cyan-300 dark:border-cyan-400/60 bg-gradient-to-r from-cyan-50 to-emerald-50 dark:from-cyan-950/50 dark:to-emerald-950/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlag
                      code={selectedCustomEdgeVoice.locale}
                      label={selectedCustomEdgeVoice.localeName}
                      className="w-6 h-4 rounded-[4px]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedCustomEdgeVoice.displayName} · {selectedCustomEdgeVoice.gender}
                      </p>
                      <p className="text-[11px] text-cyan-700 dark:text-cyan-200 truncate">
                        {selectedCustomEdgeVoice.localeName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomEdgeVoice(null)}
                    className="p-1 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    title="Clear custom global voice"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {VOICES.map((voice) => {
                  const isSelected =
                    !useReferenceVoice && !selectedCustomEdgeVoice && selectedVoice === voice.id;
                  const isPreviewing = previewingVoiceId === voice.id;
                  const isFemale = voice.gender === "Female";
                  return (
                    <div
                      key={voice.id}
                      onClick={() => {
                        setUseReferenceVoice(false);
                        setSelectedCustomEdgeVoice(null);
                        setSelectedVoice(voice.id);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-emerald-500 dark:border-emerald-400 bg-gradient-to-r from-emerald-100/80 to-teal-50/80 dark:from-emerald-600/20 dark:to-teal-600/10"
                          : "border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-950/60 hover:border-emerald-400 dark:hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${
                            isFemale
                              ? "bg-gradient-to-br from-fuchsia-100 to-rose-100 dark:from-fuchsia-500/25 dark:to-rose-500/25 border-fuchsia-300 dark:border-fuchsia-400/40 text-fuchsia-700 dark:text-fuchsia-200"
                              : "bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-500/25 dark:to-indigo-500/25 border-sky-300 dark:border-sky-400/40 text-sky-700 dark:text-sky-200"
                          }`}
                        >
                          {voice.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">{voice.name}</span>
                            <span className="text-slate-400 dark:text-slate-500">·</span>
                            <span className={isFemale ? "text-fuchsia-700 dark:text-fuchsia-300 font-medium" : "text-sky-700 dark:text-sky-300 font-medium"}>
                              {voice.gender}
                            </span>
                            <CountryFlag
                              code={voice.recommendedAccent}
                              className="w-4 h-3 rounded-[2px] ml-0.5"
                            />
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                            {voice.style}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handlePreviewVoice(e, voice)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                          isPreviewing
                            ? "border-emerald-500 dark:border-emerald-400 bg-emerald-600 text-white"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-400/50 hover:text-slate-900 dark:hover:text-white"
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

            {/* Voice Reference / Custom Profile (Amber Theme) */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/70 via-white to-slate-50/70 dark:from-amber-950/25 dark:via-[#0d1328] dark:to-[#0a0f20] p-5 space-y-3 shadow-lg shadow-amber-500/10 dark:shadow-amber-950/15">
              <button
                type="button"
                onClick={() => setShowRefPanel((p) => !p)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-400/30 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </span>
                    Reference Audio & Profile
                  </h2>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Upload or record a reference sample to match pacing & register
                  </p>
                </div>
                <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold shrink-0 ml-2">
                  {showRefPanel ? "Hide" : "Configure"}
                </span>
              </button>

              {showRefPanel && (
                <div className="space-y-3 pt-3 border-t border-amber-200/70 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      Upload Audio
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleUploadRefAudio}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleToggleRecording}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                        isRecording
                          ? "border-rose-500 bg-rose-600 text-white"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" /> Stop Mic
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Record Voice
                        </>
                      )}
                    </button>

                    {customRef && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomRef(null);
                          setUseReferenceVoice(false);
                        }}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        title="Remove reference"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {customRef?.audioUrl && (
                    <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/35 bg-white dark:bg-slate-950 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                            Attached: {customRef.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {analyzingRef
                              ? "Analyzing vocal timbre, tone & pitch register..."
                              : customRef.analysis?.summaryBadge || `${customRef.gender} Voice Profile`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const nextActive = !useReferenceVoice;
                            setUseReferenceVoice(nextActive);
                            if (nextActive) {
                              setSelectedCustomEdgeVoice(null);
                              if (customRef.analysis?.recommendedVoiceId) {
                                setSelectedVoice(customRef.analysis.recommendedVoiceId);
                              }
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shrink-0 ${
                            useReferenceVoice
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/25"
                              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white shadow-sm"
                          }`}
                        >
                          {useReferenceVoice ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Selected as Active Voice
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Select This Voice
                            </>
                          )}
                        </button>
                      </div>

                      <audio src={customRef.audioUrl} controls className="w-full h-8" />
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={refText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRefText(val);
                      setCustomRef((prev) => (prev ? { ...prev, referenceText: val } : prev));
                    }}
                    placeholder="Optional notes about this reference voice (only your main Studio script is spoken)..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}
            </div>

            {/* Delivery Tone Selector (Violet / Fuchsia Theme) */}
            <div className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-gradient-to-b from-violet-50/75 via-white to-slate-50/70 dark:from-violet-950/35 dark:via-[#0d1328] dark:to-[#0a0f20] p-5 space-y-3 shadow-lg shadow-violet-500/10 dark:shadow-violet-950/20">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-400/30 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </span>
                Delivery Tone & Emotion Mode
              </h2>

              <div className="space-y-2">
                {DELIVERY_TONES.map((tone) => {
                  const active = selectedTone === tone.id;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setSelectedTone(tone.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        active
                          ? "border-fuchsia-500 dark:border-fuchsia-400 bg-gradient-to-r from-violet-100 to-fuchsia-50 dark:from-violet-600/25 dark:to-fuchsia-600/15"
                          : "border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-950/60 hover:border-violet-400 dark:hover:border-violet-500/40"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? "text-slate-950 dark:text-white" : "text-slate-800 dark:text-slate-200"}`}>
                        {tone.label}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug mt-0.5">
                        {tone.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Script Editor, Advanced Controls, Player & Emotion Director */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-b from-white via-indigo-50/25 to-white dark:from-[#131938]/85 dark:via-[#0e1329]/95 dark:to-[#0a0e1f] p-5 md:p-6 space-y-5 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-950/30">
              {/* Sample Scripts & File Upload */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    Presets:
                  </span>
                  {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-violet-400 dark:hover:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>

                <label className="cursor-pointer px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-violet-500 text-xs text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  Upload .txt
                  <input
                    type="file"
                    accept=".txt,.md,.srt"
                    onChange={handleUploadScriptFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Optional Clip Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project or Scene Title (optional)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />

              {/* Main Script Textarea */}
              <div className="space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write or paste your script in Urdu, English, Arabic, Hindi, or any of 140+ languages..."
                  rows={8}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-y leading-relaxed"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums px-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> ~{estimatedSeconds}s
                    </span>
                    <span>·</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      Cost: {estimatedCreditsCost.toLocaleString()} credits
                    </span>
                  </div>
                  <span
                    className={
                      text.length > (profile?.isAdmin ? 100000 : profile?.maxCharsPerGeneration || planDef.maxCharsPerGeneration)
                        ? "text-rose-600 dark:text-rose-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400"
                    }
                  >
                    {text.length.toLocaleString()} /{" "}
                    {(profile?.isAdmin
                      ? 100000
                      : profile?.maxCharsPerGeneration || planDef.maxCharsPerGeneration
                    ).toLocaleString()}{" "}
                    chars
                  </span>
                </div>
              </div>

              {/* Speed & Pitch Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 p-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /> Playback Speed
                    </span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-white font-semibold">
                      {speed.toFixed(1)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-violet-600 dark:accent-violet-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Vocal Pitch
                    </span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-white font-semibold">
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
                    className="w-full accent-sky-600 dark:accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Advanced Studio Settings (Quality Steps, Silence Removal, Seed) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-4 py-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                >
                  <span>Advanced Studio Settings (Quality, Silence Trim & Seed)</span>
                  <span className="text-violet-600 dark:text-violet-400">{showAdvanced ? "Hide" : "Show"}</span>
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Synthesis Quality</span>
                        <span className="font-mono text-slate-900 dark:text-white">{qualitySteps} steps</span>
                      </div>
                      <input
                        type="range"
                        min={16}
                        max={64}
                        step={16}
                        value={qualitySteps}
                        onChange={(e) => setQualitySteps(Number(e.target.value))}
                        className="w-full accent-violet-600 dark:accent-violet-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                      <span className="text-slate-700 dark:text-slate-300">Remove Silences</span>
                      <input
                        type="checkbox"
                        checked={removeSilences}
                        onChange={(e) => setRemoveSilences(e.target.checked)}
                        className="accent-violet-600 dark:accent-violet-500 w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                      <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={randomizeSeed}
                          onChange={(e) => setRandomizeSeed(e.target.checked)}
                          className="accent-violet-600 dark:accent-violet-500"
                        />
                        Random Seed
                      </label>
                      {!randomizeSeed && (
                        <input
                          type="number"
                          value={fixedSeed}
                          onChange={(e) => setFixedSeed(Number(e.target.value))}
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-right font-mono text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className={`px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isGenerating || !text.trim()
                      ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 text-white shadow-lg shadow-fuchsia-600/25"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Synthesizing MP3...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" /> Generate Speech
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Audio Player Box */}
            {hasAudio && (
              <div className="rounded-2xl border border-cyan-300 dark:border-cyan-400/45 bg-gradient-to-r from-violet-50 via-white to-cyan-50 dark:from-violet-950/50 dark:via-[#101633] dark:to-cyan-950/40 p-5 space-y-4 shadow-lg shadow-cyan-500/10 dark:shadow-cyan-950/25">
                <audio
                  ref={audioRef}
                  src={audioEngine !== "web-speech-fallback" ? audioUrl ?? undefined : undefined}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  controls={audioEngine !== "web-speech-fallback"}
                  className={audioEngine !== "web-speech-fallback" ? "w-full h-10" : "hidden"}
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 flex items-center justify-center text-white shadow-md shadow-violet-600/30 transition-all shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      )}
                    </button>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {title.trim() ||
                          (useReferenceVoice && customRef
                            ? customRef.name
                            : selectedCustomEdgeVoice?.displayName || currentVoice.name)}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {currentAccentLabel} · {resolvedVoiceUsed || currentVoice.name} ·{" "}
                        {qualitySteps <= 16 ? "48kbps MP3" : "96kbps Studio MP3"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedNotice ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedNotice ? "Copied" : "Copy Details"}
                    </button>

                    {audioUrl && (
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-2 transition-colors shadow-sm shadow-emerald-600/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {isDownloading ? "Preparing MP3..." : "Download MP3"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sentence-by-Sentence Emotion Breakdown Panel */}
            {segments.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 p-5 space-y-3 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Sentence Emotion Director ({segments.length} Lines)
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Each sentence automatically switches vocal emotion. Adjust any line before regenerating.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {segments.map((seg, idx) => {
                    const emo = EMOTION_PROFILES[seg.emotion] || EMOTION_PROFILES.calm;
                    const isLineActive = activeSegmentIdx === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isLineActive
                            ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-slate-500">
                            Line {String(idx + 1).padStart(2, "0")}
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                            {seg.text}
                          </p>
                        </div>

                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenEmotionIdx((prev) => (prev === idx ? null : idx))
                            }
                            aria-label={`Emotion for line ${idx + 1}`}
                            className={`text-xs font-medium rounded-lg border px-2.5 py-1.5 inline-flex items-center gap-1.5 focus:outline-none ${emo.colorClass}`}
                          >
                            <span>{emo.label}</span>
                            <span className="text-[10px] opacity-70">▾</span>
                          </button>

                          {openEmotionIdx === idx && (
                            <div className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1124] shadow-xl p-1 space-y-0.5">
                              {EMOTION_OPTIONS.map((opt) => {
                                const optProfile = EMOTION_PROFILES[opt];
                                const active = seg.emotion === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      handleSegmentEmotionChange(idx, opt);
                                      setOpenEmotionIdx(null);
                                    }}
                                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                                      active
                                        ? "bg-violet-50 dark:bg-violet-500/20 text-violet-800 dark:text-violet-200 font-semibold"
                                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <span className="truncate">{optProfile.label}</span>
                                    {active && (
                                      <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-300 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Studio Audio Strip */}
            {recentClips.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/50 p-5 space-y-3 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /> Recent Studio Clips
                  </h3>
                  <Link href="/library" className="text-xs text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 font-medium">
                    Open Full Library →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {recentClips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => handlePlayRecentClip(clip)}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 hover:border-violet-300 dark:hover:border-slate-700 text-left flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{clip.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {clip.accentLabel} · {clip.characterCount.toLocaleString()} chars
                        </p>
                      </div>
                      <Play className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global 300+ Voice & 140+ Language Directory Modal */}
      {showGlobalLibrary && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[86vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1024] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Global Neural Directory ({globalLocales.length} Languages · {globalVoices.length} Voices)
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Pick any of 140+ languages with country flags or audition individual Male & Female neural voices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGlobalLibrary(false)}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs + Search + Gender Filter */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setLibraryTab("languages")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      libraryTab === "languages"
                        ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Languages ({filteredGlobalLocales.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryTab("voices")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      libraryTab === "voices"
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Voices ({filteredGlobalVoices.length})
                  </button>
                </div>

                {libraryTab === "voices" && (
                  <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    {(["All", "Male", "Female"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenderFilter(g)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          genderFilter === g
                            ? "bg-violet-600 text-white"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={voiceSearch}
                  onChange={(e) => setVoiceSearch(e.target.value)}
                  placeholder={
                    libraryTab === "languages"
                      ? "Search any of 140+ languages or countries (e.g. Urdu, Pakistan, Arabic, Hindi, French)..."
                      : "Search language or voice (e.g. Urdu, Arabic, Hindi, French, Spanish)..."
                  }
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
                {voiceSearch && (
                  <button
                    type="button"
                    onClick={() => setVoiceSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain">
              {voicesLoading ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
                  Loading global voice catalog...
                </p>
              ) : libraryTab === "languages" ? (
                filteredGlobalLocales.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
                    No languages matched your search.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredGlobalLocales.map((loc) => {
                      const isSel =
                        !selectedCustomEdgeVoice && selectedAccent === loc.locale;
                      const vCount = localeVoiceCounts.get(loc.locale) || 0;
                      return (
                        <button
                          key={loc.locale}
                          type="button"
                          onClick={() => {
                            setSelectedCustomEdgeVoice(null);
                            setSelectedAccent(loc.locale);
                            setShowGlobalLibrary(false);
                          }}
                          className={`relative overflow-hidden p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
                            isSel
                              ? "border-cyan-500 dark:border-cyan-400 bg-white dark:bg-slate-950 ring-1 ring-cyan-500/35"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-cyan-400 dark:hover:border-cyan-500/50"
                          }`}
                        >
                          <CountryFlag
                            code={loc.locale}
                            label={loc.localeName}
                            variant="backdrop"
                          />
                          <div className="relative z-10 flex items-center gap-3 min-w-0">
                            <CountryFlag
                              code={loc.locale}
                              label={loc.localeName}
                              className="w-7 h-[18px] rounded-[4px]"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {loc.localeName}
                              </p>
                              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                                {loc.locale} · {vCount} {vCount === 1 ? "voice" : "voices"}
                              </p>
                            </div>
                          </div>
                          <span className="relative z-10 shrink-0">
                            {isSel ? (
                              <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <span className="px-2 py-1 rounded-md bg-slate-100/90 dark:bg-slate-800/90 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                Select
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : filteredGlobalVoices.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
                  No voices matched your search.
                </p>
              ) : (
                filteredGlobalVoices.map((gv) => {
                  const isPrev = previewingVoiceId === gv.shortName;
                  const isSel = selectedCustomEdgeVoice?.shortName === gv.shortName;
                  return (
                    <div
                      key={gv.shortName}
                      onClick={() => {
                        setUseReferenceVoice(false);
                        setSelectedCustomEdgeVoice(gv);
                        setShowGlobalLibrary(false);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                        isSel
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-600/15"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-violet-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CountryFlag
                          code={gv.locale}
                          label={gv.localeName}
                          className="w-7 h-[18px] rounded-[4px]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {gv.displayName} ·{" "}
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              {gv.gender}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                            {gv.localeName} ({gv.locale})
                            {gv.personalities.length > 0
                              ? ` · ${gv.personalities.join(", ")}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handlePreviewVoice(e, currentVoice, gv)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 ${
                            isPrev
                              ? "border-violet-500 bg-violet-600 text-white"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          {isPrev ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                          {isPrev ? "Stop" : "Preview"}
                        </button>
                        <span className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold text-slate-800 dark:text-white">
                          Use
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}