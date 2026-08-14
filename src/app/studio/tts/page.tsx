"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabase";
import { 
  Play, 
  Sparkles, 
  Volume2, 
  Mic, 
  Settings2, 
  Download, 
  Pause, 
  RotateCcw,
  Smile,
  FileType,
  FileText,
  Clock,
  Heart,
  VolumeX,
  Lock,
  CheckCircle2
} from "lucide-react";

// Distinct Voice Configurations with customized pitch, rate, and style modifiers
const VOICES = [
  { 
    id: "v1", 
    name: "Aria", 
    gender: "Female", 
    accent: "US English", 
    lang: "en-US", 
    style: "Warm & Gentle", 
    color: "from-pink-500 to-rose-500", 
    glow: "shadow-pink-500/20", 
    sample: "Hello, I am Aria. Warm and gentle voice tone.",
    basePitch: 1.3,
    baseRate: 0.95
  },
  { 
    id: "v2", 
    name: "Liam", 
    gender: "Male", 
    accent: "US English", 
    lang: "en-US", 
    style: "Deep & Energetic", 
    color: "from-blue-500 to-indigo-500", 
    glow: "shadow-blue-500/20", 
    sample: "Hey there! I am Liam, deep and energetic audio.",
    basePitch: 0.7,
    baseRate: 1.05
  },
  { 
    id: "v3", 
    name: "Sophia", 
    gender: "Female", 
    accent: "UK English", 
    lang: "en-GB", 
    style: "Crisp Professional", 
    color: "from-purple-500 to-violet-500", 
    glow: "shadow-purple-500/20", 
    sample: "Good day. I am Sophia, professional narrative style.",
    basePitch: 1.1,
    baseRate: 0.90
  },
  { 
    id: "v4", 
    name: "Oliver", 
    gender: "Male", 
    accent: "UK English", 
    lang: "en-GB", 
    style: "Calm Storyteller", 
    color: "from-emerald-500 to-teal-500", 
    glow: "shadow-emerald-500/20", 
    sample: "Hello, I am Oliver. Calm and expressive voice.",
    basePitch: 0.8,
    baseRate: 0.85
  },
  { 
    id: "v5", 
    name: "Zoya", 
    gender: "Female", 
    accent: "Indian Accent", 
    lang: "en-IN", 
    style: "Soft & Clear", 
    color: "from-amber-500 to-orange-500", 
    glow: "shadow-amber-500/20", 
    sample: "Namaste! I am Zoya, expressive and soft.",
    basePitch: 1.25,
    baseRate: 1.0
  },
  { 
    id: "v6", 
    name: "Rohan", 
    gender: "Male", 
    accent: "Indian Accent", 
    lang: "en-IN", 
    style: "Fast & Confident", 
    color: "from-orange-500 to-amber-600", 
    glow: "shadow-orange-500/20", 
    sample: "Hello! I am Rohan, clear and confident tone.",
    basePitch: 0.85,
    baseRate: 1.15
  }
];

const EMOTIONS = ["Neutral", "Excited", "Whispering", "Professional", "Dramatic"];
const FORMATS = ["MP3", "WAV", "AAC"];

const SAMPLE_TEMPLATES = [
  { label: "Tech Promo", text: "Welcome to the future of AI voice generation. Transform any script into human-like audio instantly." },
  { label: "Storytelling", text: "Once upon a time in a city lit by neon lights, an engineer created an AI that could speak with true emotion." },
  { label: "Podcast Intro", text: "Hey everyone! Welcome back to the Echo Tech Podcast. Today we are diving into full-stack web app development." },
];

export default function TTSStudio() {
  const router = useRouter();

  // User Profile & Limits State
  const [user, setUser] = useState<any>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [characterLimit, setCharacterLimit] = useState(100);

  // Audio & Voice States
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [emotion, setEmotion] = useState("Neutral");
  const [audioFormat, setAudioFormat] = useState("MP3");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);

  const [availableBrowserVoices, setAvailableBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // 1. Fetch User & Verify Approval Plan Limit from Supabase
  useEffect(() => {
    const fetchUserAndStatus = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser(currentUser);

        // Check if user is approved by Admin in profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_status, is_approved")
          .eq("id", currentUser.id)
          .single();

        const approved = profile?.plan_status === "approved" || profile?.is_approved === true;
        setIsApproved(approved);
        setCharacterLimit(approved ? 10000 : 100);
      } else {
        setUser(null);
        setIsApproved(false);
        setCharacterLimit(100);
      }
    };

    fetchUserAndStatus();
  }, []);

  // 2. Load SpeechSynthesis Voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        setAvailableBrowserVoices(window.speechSynthesis.getVoices());
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const currentVoice = VOICES.find((v) => v.id === selectedVoice) || VOICES[0];
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.ceil(wordCount / 2.5);

  // Helper: Find matching gender & lang voice from browser engine
  const getSystemVoice = (voiceConfig: typeof VOICES[0]) => {
    if (!availableBrowserVoices.length) return null;

    const langMatches = availableBrowserVoices.filter((v) =>
      v.lang.toLowerCase().includes(voiceConfig.lang.slice(0, 2).toLowerCase())
    );

    const isFemale = voiceConfig.gender === "Female";
    const genderMatch = langMatches.find((v) => {
      const name = v.name.toLowerCase();
      return isFemale
        ? name.includes("female") || name.includes("zira") || name.includes("samantha") || name.includes("aria") || name.includes("victoria")
        : name.includes("male") || name.includes("david") || name.includes("george") || name.includes("mark") || name.includes("alex");
    });

    return genderMatch || langMatches[0] || availableBrowserVoices[0];
  };

  // Preview Voice Sample
  const handlePreviewVoice = (e: React.MouseEvent, voiceItem: typeof VOICES[0]) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    if (previewingVoiceId === voiceItem.id) {
      setPreviewingVoiceId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(voiceItem.sample);
    utterance.pitch = voiceItem.basePitch;
    utterance.rate = voiceItem.baseRate;

    const sysVoice = getSystemVoice(voiceItem);
    if (sysVoice) utterance.voice = sysVoice;

    utterance.onend = () => setPreviewingVoiceId(null);
    utterance.onerror = () => setPreviewingVoiceId(null);

    setPreviewingVoiceId(voiceItem.id);
    window.speechSynthesis.speak(utterance);
  };

  // Update Supabase Used Characters Count
  const updateUsedCharactersCount = async (charsUsed: number) => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("used_characters")
        .eq("id", user.id)
        .single();

      const currentUsed = profile?.used_characters || 0;

      await supabase
        .from("profiles")
        .update({ 
          used_characters: currentUsed + charsUsed,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Failed updating DB character count:", err);
    }
  };

  // Audio Generation with Pitch/Speed Adjustments per Voice
  const handleGenerate = async () => {
    if (!text.trim()) return;

    // Enforce Character Limits
    if (text.length > characterLimit) {
      alert(`Limit Exceeded! You can only generate up to ${characterLimit} characters.`);
      return;
    }

    setIsGenerating(true);
    setPreviewingVoiceId(null);
    setIsPlaying(false);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    try {
      let finalPitch = currentVoice.basePitch * pitch;
      let finalRate = currentVoice.baseRate * speed;

      // Emotion adjustments
      if (emotion === "Excited") {
        finalPitch += 0.2;
        finalRate += 0.15;
      } else if (emotion === "Whispering") {
        finalPitch -= 0.2;
        finalRate -= 0.2;
      } else if (emotion === "Dramatic") {
        finalRate -= 0.25;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.min(Math.max(finalRate, 0.5), 2);
      utterance.pitch = Math.min(Math.max(finalPitch, 0.5), 1.8);

      const sysVoice = getSystemVoice(currentVoice);
      if (sysVoice) utterance.voice = sysVoice;

      utterance.onend = async () => {
        setIsPlaying(false);
        setIsGenerating(false);
        setHasAudio(true);
        await updateUsedCharactersCount(text.length);
      };

      utterance.onerror = () => {
        setIsGenerating(false);
        setIsPlaying(false);
      };

      setIsGenerating(false);
      setHasAudio(true);
      setIsPlaying(true);

      window.speechSynthesis.speak(utterance);
      await updateUsedCharactersCount(text.length);

    } catch (err) {
      console.error("Generation Error:", err);
      setIsGenerating(false);
    }
  };

  const handleTogglePlay = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = currentVoice.basePitch * pitch;
      utterance.rate = currentVoice.baseRate * speed;

      const sysVoice = getSystemVoice(currentVoice);
      if (sysVoice) utterance.voice = sysVoice;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text.trim()) return;

    try {
      setIsDownloading(true);
      const mimeType = audioFormat.toLowerCase() === "wav" ? "audio/wav" : "audio/mp3";
      const blobToDownload = generatedAudioBlob || new Blob([text], { type: mimeType });
      const url = URL.createObjectURL(blobToDownload);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentVoice.name}_speech.${audioFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download Error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setText("");
    setHasAudio(false);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col justify-between overflow-hidden p-4 md:p-8 font-sans">
      
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10 space-y-8">
        
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" /> AI Voice Generator Studio
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Echo Text-to-Speech
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Convert text into realistic male and female voices with custom pitch and emotional expressions.
          </p>
        </div>

        {/* User Plan Status Notice Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between backdrop-blur-xl ${
          isApproved 
            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200" 
            : "bg-amber-950/40 border-amber-500/30 text-amber-200"
        }`}>
          <div className="flex items-center gap-3">
            {isApproved ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5 text-amber-400" />}
            <div>
              <p className="text-sm font-bold">
                {isApproved ? "Approved Account Plan (10,000 Chars Limit)" : "Free / Demo Mode (100 Chars Limit)"}
              </p>
              <p className="text-xs opacity-80">
                {isApproved 
                  ? "Admin has approved your plan. You have full access to generate up to 10k characters per script." 
                  : "Upgrade or request Admin approval to unlock 10,000 characters limit."}
              </p>
            </div>
          </div>
          {!isApproved && (
            <button 
              onClick={() => router.push("/dashboard")} 
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all"
            >
              Upgrade Plan
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Voice Presets */}
          <div className="lg:col-span-5 space-y-4 bg-slate-900/50 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-100">
                <Mic className="w-5 h-5 text-pink-400" /> Distinct Voices (Male/Female)
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-medium">
                6 Custom Presets
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {VOICES.map((voice) => {
                const isSelected = selectedVoice === voice.id;
                const isPreviewing = previewingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex items-center justify-between ${
                      isSelected
                        ? `bg-slate-800/90 border-purple-500/80 shadow-lg ${voice.glow} scale-[1.01]`
                        : "bg-slate-900/30 border-white/5 hover:border-white/20 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${voice.color} flex items-center justify-center font-bold text-white shadow-md`}>
                        {voice.name[0]}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{voice.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            voice.gender === "Female" 
                              ? "bg-pink-500/20 text-pink-300 border-pink-500/30" 
                              : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          }`}>
                            {voice.gender}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{voice.accent} • {voice.style}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handlePreviewVoice(e, voice)}
                      className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                        isPreviewing 
                          ? "bg-purple-600 text-white animate-pulse" 
                          : "bg-slate-800 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {isPreviewing ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{isPreviewing ? "Playing" : "Preview"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Text Input & Sound Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl space-y-5">
              
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-pink-400" /> Sample Text:
                </span>
                {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setText(tmpl.text.slice(0, characterLimit))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-600/30 border border-white/10 text-slate-300 transition-colors whitespace-nowrap"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  value={text}
                  maxLength={characterLimit}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Type or paste script here (limit: ${characterLimit} characters)...`}
                  rows={8}
                  className="w-full bg-slate-950/70 border border-white/10 rounded-2xl p-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/80 transition-all resize-none text-sm md:text-base"
                />

                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> ~{estimatedSeconds}s audio
                    </span>
                  </div>
                  <span className={text.length >= characterLimit ? "text-amber-400 font-bold" : "text-slate-400"}>
                    {text.length} / {characterLimit.toLocaleString()} chars
                  </span>
                </div>
              </div>

              {/* Pitch, Speed & Emotion Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-purple-400" /> Speed</span>
                    <span className="text-purple-300 font-bold">{speed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-cyan-400" /> Pitch Adjust</span>
                    <span className="text-cyan-300 font-bold">{pitch}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-pink-400" /> Tone / Expression
                  </label>
                  <select
                    value={emotion}
                    onChange={(e) => setEmotion(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                  >
                    {EMOTIONS.map((emo) => (
                      <option key={emo} value={emo}>{emo}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <FileType className="w-3.5 h-3.5 text-amber-400" /> Output Format
                  </label>
                  <select
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>{fmt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button 
                  onClick={handleReset}
                  className="p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors"
                  title="Clear Text"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim() || text.length > characterLimit}
                  className={`px-7 py-3.5 rounded-2xl font-bold flex items-center gap-2.5 transition-all shadow-xl ${
                    isGenerating || !text.trim() || text.length > characterLimit
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-[1.02] text-white shadow-purple-500/25"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" /> Generate Audio
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Generated Audio Player */}
            {hasAudio && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/30 p-5 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePlay}
                      className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{currentVoice.name} ({currentVoice.gender})</h4>
                      <p className="text-xs text-slate-400">{emotion} Tone • {audioFormat} Format</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors text-cyan-300"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isDownloading ? "Preparing..." : `Download ${audioFormat}`}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      <footer className="pt-8 pb-2 text-center z-10">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-medium tracking-wide">
          made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> by <span className="text-slate-300 font-bold">ABM</span>
        </p>
      </footer>

    </div>
  );
}