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

const VOICES = [
  { id: "v1", name: "Aria", gender: "Female", accent: "US English", lang: "en-US", style: "Warm & Friendly", color: "from-pink-500 to-rose-500", glow: "shadow-pink-500/20", sample: "Hello, I am Aria. How can I help you today?" },
  { id: "v2", name: "Liam", gender: "Male", accent: "US English", lang: "en-US", style: "Deep & Energetic", color: "from-blue-500 to-indigo-500", glow: "shadow-blue-500/20", sample: "Hey there! I am Liam, ready to power your content." },
  { id: "v3", name: "Sophia", gender: "Female", accent: "UK English", lang: "en-GB", style: "Professional", color: "from-purple-500 to-violet-500", glow: "shadow-purple-500/20", sample: "Good day. I am Sophia, bringing elegance to your narrative." },
  { id: "v4", name: "Oliver", gender: "Male", accent: "UK English", lang: "en-GB", style: "Calm & Expressive", color: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/20", sample: "Hello, I am Oliver. Let's make something great together." },
  { id: "v5", name: "Zoya", gender: "Female", accent: "Indian English", lang: "en-IN", style: "Natural & Clear", color: "from-amber-500 to-orange-500", glow: "shadow-amber-500/20", sample: "Namaste! I am Zoya, clear and expressive." },
];

const EMOTIONS = ["Neutral", "Excited", "Whispering", "Professional", "Dramatic"];

export default function TTSStudio() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [emotion, setEmotion] = useState("Neutral");

  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Record Browser Speech into real Playable Audio (WAV/Blob)
  const generateRealAudio = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setAudioUrl(null);

    try {
      const speech = new SpeechSynthesisUtterance(text);
      speech.rate = speed;
      speech.pitch = pitch;

      const voices = window.speechSynthesis.getVoices();
      const currentConfig = VOICES.find(v => v.id === selectedVoice);
      
      if (currentConfig && voices.length) {
        const sysVoice = voices.find(v => v.lang.includes(currentConfig.lang.slice(0, 2)));
        if (sysVoice) speech.voice = sysVoice;
      }

      // Record System Sound using AudioContext
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsGenerating(false);

        // Stop Mic stream after recording
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      window.speechSynthesis.speak(speech);

      speech.onend = () => {
        setTimeout(() => {
          mediaRecorder.stop();
        }, 500);
      };

      speech.onerror = () => {
        mediaRecorder.stop();
        setIsGenerating(false);
      };

    } catch (err) {
      // Fallback: If Mic Access is Denied, Create TTS directly via SpeechSynthesis
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text);
      speech.rate = speed;
      speech.pitch = pitch;

      speech.onend = () => setIsGenerating(false);
      window.speechSynthesis.speak(speech);
      setIsGenerating(false);
      alert("آڈیو ڈاؤن لوڈ کرنے کے لیے براؤزر کو 'Microphone Access' لازمی دیں۔ پرانے پلے آپشن سے آڈیو سنیں۔");
    }
  };

  const handleTogglePlay = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text);
      speech.rate = speed;
      speech.pitch = pitch;
      speech.onend = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(speech);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans max-w-4xl mx-auto space-y-6">
      
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-purple-400">Echo Voice Studio</h1>
        <p className="text-sm text-slate-400">Text to Speech Player & Real WAV Audio Downloader</p>
      </div>

      {/* Input Box */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-white/10 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="یہاں اپنا ٹیکسٹ لکھیں..."
          rows={5}
          className="w-full bg-slate-950 p-3 rounded-xl border border-white/10 focus:outline-none text-slate-200"
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <button
            onClick={generateRealAudio}
            disabled={isGenerating || !text.trim()}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl disabled:opacity-50"
          >
            {isGenerating ? "Recording Audio..." : "1. Generate Playable Audio"}
          </button>

          {audioUrl && (
            <a
              href={audioUrl}
              download="ai-voice-speech.wav"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download WAV (Playable)
            </a>
          )}
        </div>
      </div>

      {/* Hidden Audio Player for Recorded File */}
      {audioUrl && (
        <div className="bg-slate-900 p-4 rounded-2xl border border-purple-500/40 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-300">Audio Generated Successfully!</p>
            <p className="text-xs text-slate-400">یہ آڈیو فائل اب آپ کے پی سی پر بھی پلے ہوگی۔</p>
          </div>

          <button
            onClick={handleTogglePlay}
            className="p-3 bg-purple-600 text-white rounded-full"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <audio 
            ref={audioRef} 
            src={audioUrl} 
            onEnded={() => setIsPlaying(false)} 
            className="hidden" 
          />
        </div>
      )}

    </div>
  );
}