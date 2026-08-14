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
  VolumeX
} from "lucide-react";

// 10 Diverse AI Voice Presets with preview texts
const VOICES = [
  { id: "v1", name: "Aria", gender: "Female", accent: "US English", lang: "en-US", style: "Warm & Friendly", color: "from-pink-500 to-rose-500", glow: "shadow-pink-500/20", sample: "Hello, I am Aria. How can I help you today?" },
  { id: "v2", name: "Liam", gender: "Male", accent: "US English", lang: "en-US", style: "Deep & Energetic", color: "from-blue-500 to-indigo-500", glow: "shadow-blue-500/20", sample: "Hey there! I am Liam, ready to power your content." },
  { id: "v3", name: "Sophia", gender: "Female", accent: "UK English", lang: "en-GB", style: "Professional", color: "from-purple-500 to-violet-500", glow: "shadow-purple-500/20", sample: "Good day. I am Sophia, bringing elegance to your narrative." },
  { id: "v4", name: "Oliver", gender: "Male", accent: "UK English", lang: "en-GB", style: "Calm & Expressive", color: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/20", sample: "Hello, I am Oliver. Let's make something great together." },
  { id: "v5", name: "Zoya", gender: "Female", accent: "Indian English", lang: "en-IN", style: "Natural & Clear", color: "from-amber-500 to-orange-500", glow: "shadow-amber-500/20", sample: "Namaste! I am Zoya, clear and expressive." },
  { id: "v6", name: "Mateo", gender: "Male", accent: "Spanish", lang: "es-ES", style: "Lively & Upbeat", color: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/20", sample: "Hola! Soy Mateo, listo para tu proyecto." },
  { id: "v7", name: "Chloe", gender: "Female", accent: "French", lang: "fr-FR", style: "Smooth & Soft", color: "from-fuchsia-500 to-pink-500", glow: "shadow-fuchsia-500/20", sample: "Bonjour, je suis Chloe." },
  { id: "v8", name: "Hans", gender: "Male", accent: "German", lang: "de-DE", style: "Authoritative", color: "from-yellow-500 to-amber-600", glow: "shadow-yellow-500/20", sample: "Hallo, ich bin Hans." },
  { id: "v9", name: "Kai", gender: "Male", accent: "Asian Accent", lang: "ja-JP", style: "Youthful Vlogger", color: "from-green-400 to-emerald-600", glow: "shadow-green-500/20", sample: "Konnichiwa! I am Kai." },
  { id: "v10", name: "Amara", gender: "Female", accent: "African Accent", lang: "en-ZA", style: "Rich & Storyteller", color: "from-violet-600 to-indigo-600", glow: "shadow-violet-500/20", sample: "Greetings! I am Amara, ready to tell your story." },
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
  const [loadingAuth, setLoadingAuth] = useState(true);

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

  const [availableBrowserVoices, setAvailableBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Authentication Check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setLoadingAuth(false);
      }
    };

    checkUser();
  }, [router]);

  // Load Browser Voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableBrowserVoices(voices);
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

  const currentVoice = VOICES.find((v) => v.id === selectedVoice);
  
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.ceil(wordCount / 2.5); 

  // Helper to match browser system voice
  const getSystemVoice = (voiceConfig: typeof VOICES[0]) => {
    if (!availableBrowserVoices.length) return null;

    return (
      availableBrowserVoices.find((v) => 
        v.lang.toLowerCase() === voiceConfig.lang.toLowerCase()
      ) ||
      availableBrowserVoices.find((v) => 
        v.lang.toLowerCase().includes(voiceConfig.lang.slice(0, 2).toLowerCase())
      ) ||
      availableBrowserVoices[0]
    );
  };

  // Voice Preview Action (Listen Sample)
  const handlePreviewVoice = (e: React.MouseEvent, voiceItem: typeof VOICES[0]) => {
    e.stopPropagation();

    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    if (previewingVoiceId === voiceItem.id) {
      setPreviewingVoiceId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(voiceItem.sample);
    utterance.rate = 1;
    utterance.pitch = 1;

    const sysVoice = getSystemVoice(voiceItem);
    if (sysVoice) utterance.voice = sysVoice;

    utterance.onend = () => setPreviewingVoiceId(null);
    utterance.onerror = () => setPreviewingVoiceId(null);

    setPreviewingVoiceId(voiceItem.id);
    window.speechSynthesis.speak(utterance);
  };

  // Main Text-To-Speech Playback
  const speakText = (textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = speed;
    utterance.pitch = pitch;

    if (currentVoice) {
      const sysVoice = getSystemVoice(currentVoice);
      if (sysVoice) utterance.voice = sysVoice;
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      speakText(text);
    }
  };

  const handleGenerate = () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setPreviewingVoiceId(null);

    setTimeout(() => {
      setIsGenerating(false);
      setHasAudio(true);
      speakText(text); // Direct trigger after simulation
    }, 1000);
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setText("");
    setHasAudio(false);
    setIsPlaying(false);
    setPreviewingVoiceId(null);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Authenticating TTS Studio access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col justify-between overflow-hidden p-4 md:p-8 font-sans">
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Next-Gen AI Voice Studio
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Echo Text-to-Speech
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Create ultra-realistic AI voiceovers with pitch, emotion, and format controls up to 15k characters.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Voice Picker */}
          <div className="lg:col-span-5 space-y-4 bg-slate-900/50 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-100">
                <Mic className="w-5 h-5 text-pink-400" /> Select AI Voice
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-medium">
                10 Available
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
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
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {voice.gender}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{voice.accent} • {voice.style}</p>
                      </div>
                    </div>

                    {/* Listen Sample Preview Button */}
                    <button
                      onClick={(e) => handlePreviewVoice(e, voice)}
                      title="Listen Voice Sample"
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

          {/* Right Column: Studio Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl space-y-5">
              
              {/* Quick Template Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-pink-400" /> Templates:
                </span>
                {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setText(tmpl.text)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-600/30 border border-white/10 text-slate-300 hover:text-purple-200 transition-colors whitespace-nowrap"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Text Area */}
              <div className="space-y-2">
                <textarea
                  value={text}
                  maxLength={15000}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type or paste your script here (up to 15,000 characters)..."
                  rows={8}
                  className="w-full bg-slate-950/70 border border-white/10 rounded-2xl p-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/80 transition-all resize-none font-normal leading-relaxed text-sm md:text-base"
                />

                {/* Live Character & Time Counters */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> ~{estimatedSeconds}s audio
                    </span>
                  </div>
                  <span className={text.length > 14000 ? "text-amber-400 font-bold" : "text-slate-500"}>
                    {text.length.toLocaleString()} / 15,000 chars
                  </span>
                </div>
              </div>

              {/* Advanced Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                
                {/* Speed Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-purple-400" /> Speed</span>
                    <span className="text-purple-300 font-bold">{speed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Pitch Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-cyan-400" /> Pitch</span>
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

                {/* Emotion Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-pink-400" /> Tone / Emotion
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

                {/* Audio Format Selector */}
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

              {/* Control Buttons */}
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
                  disabled={isGenerating || !text.trim()}
                  className={`px-7 py-3.5 rounded-2xl font-bold flex items-center gap-2.5 transition-all shadow-xl ${
                    isGenerating || !text.trim()
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] text-white shadow-purple-500/25"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Audio...
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
              <div className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/30 p-5 rounded-3xl shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePlay}
                      className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{currentVoice?.name} ({emotion} Tone)</h4>
                      <p className="text-xs text-slate-400">{currentVoice?.accent} • {audioFormat} Format</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => speakText(text)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors text-cyan-300"
                  >
                    <Download className="w-3.5 h-3.5" /> Re-play {audioFormat}
                  </button>
                </div>

                {/* Animated Waveform */}
                <div className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-950/60 rounded-xl border border-white/5">
                  {[...Array(32)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full bg-gradient-to-t from-pink-500 to-purple-400 transition-all duration-300 ${
                        isPlaying ? "animate-pulse" : "h-2"
                      }`}
                      style={{
                        height: isPlaying ? `${Math.floor(Math.random() * 28) + 8}px` : "6px",
                        animationDelay: `${i * 0.05}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Creator Credit Footer */}
      <footer className="pt-8 pb-2 text-center z-10">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-medium tracking-wide">
          made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> by <span className="text-slate-300 font-bold">ABM</span>
        </p>
      </footer>

    </div>
  );
}