import Link from "next/link";
import { ArrowRight, Globe2, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { LiveSupportSummaryStrip } from "@/components/live-contact-links";

export const metadata = buildPageMetadata({
  title: "About Us – Echo Clone Studio by ABM CodeSpace",
  description:
    "Learn about Echo Clone AI Voice & Multi-Emotion TTS Studio developed by ABM CodeSpace. Contact codeabm71@gmail.com or +1 (401) 572-1696.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 space-y-16">
      <section className="space-y-5 max-w-3xl">
        <p className="text-xs font-semibold tracking-wide bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
          Echo Clone · Developed by ABM CodeSpace
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight [text-wrap:balance]">
          Building expressive, studio-grade AI voice technology for global creators.
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Echo Clone is an AI text-to-speech and multi-emotion voice production platform engineered by{" "}
          <strong className="text-white">ABM CodeSpace</strong>. Built for YouTube storytellers, audiobook publishers, agencies, and educators, Echo Clone turns plain scripts into natural male and female speech across 140+ regional accents and languages.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/studio/tts"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 text-white text-xs font-semibold transition-all whitespace-nowrap"
          >
            Open Voice Studio <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-100 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Contact ABM CodeSpace
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-[#0f1329] to-[#0a0e1d] p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-300 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">
            Sentence-Level Story Acting
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Story Narration mode reads every line in context, dynamically shifting vocal pace, energy, and inflection across angry, laughing, humorous, sad, whispering, and excited moments.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-[#0f1329] to-[#0a0e1d] p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
            <Globe2 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">
            140+ Regional Languages
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Native-accented synthesis across US, UK, Australian, Urdu, Arabic, Hindi, Turkish, European, and East Asian scripts with instant Auto-Detect and clean Chrome MP3 downloads.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-[#0f1329] to-[#0a0e1d] p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">
            Engineered by ABM CodeSpace
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            ABM CodeSpace crafts full-stack AI platforms, cloud voice workflows, and high-reliability creator tools tailored for global and local PKR creator economies.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <ShieldCheck className="w-4 h-4" /> Direct Support & Company Channels
        </div>
        <LiveSupportSummaryStrip />
      </section>
    </div>
  );
}
