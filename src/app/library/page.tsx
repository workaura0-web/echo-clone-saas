"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase/auth";
import {
  deleteGenerationRecord,
  GenerationRecord,
  getUserGenerations,
} from "@/lib/firebase/db";
import {
  cacheAudioClip,
  getCachedAudioClip,
  removeCachedAudioClip,
} from "@/lib/audio/audioCache";
import { downloadAudioAsMp3 } from "@/lib/audio/downloadMp3";
import { EMOTION_PROFILES, VOICES } from "@/lib/audio/accentsAndVoices";
import {
  AnalyzedSegment,
  analyzeScriptEmotionsLocally,
  speakSegmentsExpressively,
  stopSpeaking,
} from "@/lib/audio/speechSynth";
import { onAuthStateChanged } from "firebase/auth";
import {
  Clock,
  Download,
  Globe2,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

export default function LibraryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toneFilter, setToneFilter] = useState("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopFallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const items = await getUserGenerations(user.uid);
          setGenerations(items);
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : "Failed to load saved audio library."
          );
        }
      } else {
        setUserId(null);
        setGenerations([]);
      }
      setLoading(false);
    });

    return () => {
      stopSpeaking();
      stopFallbackRef.current?.();
      unsub();
    };
  }, []);

  const stopAllPlayback = () => {
    stopSpeaking();
    stopFallbackRef.current?.();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  };

  const parseSegments = (item: GenerationRecord): AnalyzedSegment[] => {
    try {
      const parsed = JSON.parse(item.segmentsJson || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fallback
    }
    return analyzeScriptEmotionsLocally(item.text, item.toneId);
  };

  const handleTogglePlay = async (item: GenerationRecord) => {
    if (playingId === item.id) {
      stopAllPlayback();
      return;
    }

    stopAllPlayback();
    setErrorMsg(null);
    setPlayingId(item.id);

    // 1. Check locally cached neural MP3/WAV audio first
    let playableUrl = await getCachedAudioClip(item.id);

    // 2. If not cached (or previously generated as fallback), synthesize real neural MP3 on demand
    const segs = parseSegments(item);
    if (!playableUrl) {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: item.text,
            voiceId: item.voiceId,
            accentId: item.accentId,
            toneId: item.toneId,
            customSegments: segs,
          }),
        });
        const data = await res.json();
        if (res.ok && data.audioUrl) {
          playableUrl = data.audioUrl;
          await cacheAudioClip(item.id, data.audioUrl);
        }
      } catch {
        // Fall through cleanly
      }
    }

    if (playableUrl && audioRef.current) {
      audioRef.current.src = playableUrl;
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.onerror = () => setPlayingId(null);
      audioRef.current.play().catch(() => setPlayingId(null));
      return;
    }

    // 3. Last-resort local speech fallback
    const voice = VOICES.find((v) => v.id === item.voiceId) || VOICES[0];
    stopFallbackRef.current = speakSegmentsExpressively(segs, voice, {
      accentId: item.accentId,
      onComplete: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    });
  };

  const handleDownload = async (item: GenerationRecord) => {
    try {
      setDownloadingId(item.id);
      setErrorMsg(null);
      let url = await getCachedAudioClip(item.id);

      if (!url) {
        const segs = parseSegments(item);
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: item.text,
            voiceId: item.voiceId,
            accentId: item.accentId,
            toneId: item.toneId,
            customSegments: segs,
          }),
        });
        const data = await res.json();
        if (res.ok && data.audioUrl) {
          url = data.audioUrl;
          await cacheAudioClip(item.id, data.audioUrl);
        }
      }

      if (url) {
        await downloadAudioAsMp3(url, item.title || "echo_clip");
      } else {
        setErrorMsg("Could not synthesize MP3 audio right now. Please try again.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (playingId === id) stopAllPlayback();
    await deleteGenerationRecord(id);
    await removeCachedAudioClip(id);
    setGenerations((prev) => prev.filter((item) => item.id !== id));
  };

  const filtered = generations.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.voiceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.accentLabel.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTone = toneFilter === "all" || item.toneId === toneFilter;
    return matchesSearch && matchesTone;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <audio ref={audioRef} className="hidden" />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Audio Library & History
            </h1>
            <p className="text-xs text-slate-400">
              Replay, inspect sentence emotions, and download your generated voice clips.
            </p>
          </div>
          <Link
            href="/studio/tts"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors self-start sm:self-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Generation
          </Link>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, voice, accent, or script..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            {[
              { id: "all", label: "All" },
              { id: "story", label: "Story" },
              { id: "speech", label: "Speech" },
              { id: "professional", label: "Corporate" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setToneFilter(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  toneFilter === tab.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-44 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse p-5"
              />
            ))}
          </div>
        ) : !userId ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-4">
            <Music className="w-10 h-10 text-violet-400 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">
                Sign in to view your saved Audio Library
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Your generated stories, speeches, and downloads are synced privately to your account.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
            >
              Sign In
            </Link>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((item) => {
              const isPlaying = playingId === item.id;
              const segs = parseSegments(item);
              const uniqueEmotions = Array.from(
                new Set(segs.map((s) => s.emotion))
              ).slice(0, 4);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mic className="w-3 h-3 text-violet-400" />
                            {item.voiceName}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Globe2 className="w-3 h-3 text-sky-400" />
                            {item.accentLabel}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-mono tabular-nums">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {item.durationSeconds}s
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete clip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 line-clamp-2 leading-relaxed">
                      &ldquo;{item.text}&rdquo;
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>{item.toneLabel}</span>
                      {uniqueEmotions.length > 0 && (
                        <>
                          <span>·</span>
                          <span>
                            Emotions:{" "}
                            {uniqueEmotions
                              .map((e) => EMOTION_PROFILES[e]?.label.split(" ")[0] || e)
                              .join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(item)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-white" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" /> Play Audio
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      disabled={downloadingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      {downloadingId === item.id ? "Preparing MP3..." : "Download MP3"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-4">
            <Music className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">No Audio Clips Yet</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Open the TTS Studio, enter a story or speech script, and click Generate Audio to save it here.
              </p>
            </div>
            <Link
              href="/studio/tts"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
            >
              Open TTS Studio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}