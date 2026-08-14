"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Share2, 
  Search, 
  Music, 
  Plus, 
  Heart,
  Clock,
  Mic
} from "lucide-react";

// Mock Data for Saved Generations (Replace with Supabase/Backend fetch)
const INITIAL_GENERATIONS = [
  {
    id: "1",
    title: "Product Explainer Script",
    voice: "Aria (US English)",
    duration: "0:45",
    date: "12 Aug 2026",
    text: "Welcome to Echo AI! Generate human-like voiceovers in seconds with full emotion control.",
    format: "MP3"
  },
  {
    id: "2",
    title: "Podcast Intro Theme",
    voice: "Liam (Deep Male)",
    duration: "1:20",
    date: "10 Aug 2026",
    text: "Hey everyone, welcome back to another episode of tech insights with your host.",
    format: "WAV"
  }
];

export default function LibraryPage() {
  const [generations, setGenerations] = useState(INITIAL_GENERATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Filter Search
  const filteredGenerations = generations.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.voice.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setGenerations(generations.filter(item => item.id !== id));
  };

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col justify-between p-4 md:p-8 overflow-hidden font-sans">
      
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs text-purple-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Audio Vault
            </div>
            <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              Audio Library & History
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              Listen, download, and manage your AI-generated voiceovers.
            </p>
          </div>

          <Link
            href="/studio/tts"
            className="self-start md:self-auto px-5 py-3 rounded-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] text-white text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Voice
          </Link>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, voice or text..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/60 border border-white/10 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500/80 transition-all"
            />
          </div>

          <span className="text-xs text-slate-400 font-semibold self-end sm:self-auto">
            {generations.length} Saved Generations
          </span>
        </div>

        {/* Content Section */}
        {filteredGenerations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGenerations.map((item) => {
              const isPlaying = playingId === item.id;
              return (
                <div 
                  key={item.id}
                  className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl hover:border-purple-500/40 transition-all space-y-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-100 text-sm">{item.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><Mic className="w-3 h-3 text-pink-400" /> {item.voice}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-cyan-400" /> {item.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Audio Preview Text */}
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 line-clamp-2 leading-relaxed">
                    "{item.text}"
                  </p>

                  {/* Player & Download Toolbar */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePlay(item.id)}
                        className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 hover:scale-105 transition-transform"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                      </button>

                      {/* Animated Waveform Visualizer */}
                      <div className="flex items-center gap-1 h-6">
                        {[...Array(16)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-0.5 rounded-full bg-purple-400 transition-all ${
                              isPlaying ? "animate-pulse" : "h-1.5 opacity-40"
                            }`}
                            style={{
                              height: isPlaying ? `${Math.floor(Math.random() * 18) + 6}px` : "6px",
                              animationDelay: `${i * 0.08}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Download Button */}
                    <button 
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download {item.format}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mx-auto text-purple-400">
              <Music className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-200">No Audio Generations Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Go to TTS Studio, enter your script text, and click generate to save your audio here.
              </p>
            </div>
            <Link
              href="/studio/tts"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-500/20"
            >
              Go to TTS Studio
            </Link>
          </div>
        )}

      </div>

      {/* Creator Credit Footer */}
      <div className="pt-8 pb-2 text-center z-10">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-medium tracking-wide">
          made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> by <span className="text-slate-300 font-bold">ABM</span>
        </p>
      </div>

    </div>
  );
}