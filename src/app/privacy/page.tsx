import Link from "next/link";
import {
  ArrowRight,
  Database,
  FileAudio,
  Lock,
  Receipt,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { LiveSupportSummaryStrip } from "@/components/live-contact-links";

export const metadata = buildPageMetadata({
  title: "Privacy Policy – Echo Clone Studio",
  description:
    "Privacy Policy for Echo Clone AI Voice & Multi-Emotion TTS Studio developed by ABM CodeSpace. Learn how accounts, @usernames, scripts, reference audio, and payments are protected.",
  path: "/privacy",
});

const PRIVACY_SECTIONS = [
  {
    id: "account-identity",
    number: "01",
    title: "Account & Authentication Information",
    icon: UserCircle2,
    accent: "text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/25",
    paragraphs: [
      "When you register on Echo Clone Studio via Google Sign-In or email + password, we store your email address, display name, unique @username handle, active subscription quota, and a timestamp confirming your acceptance of our Terms & Conditions and Privacy Policy.",
      "Your lowercase @username is indexed securely to allow fast sign-in and password recovery using either your @username or email address. Public user list scraping is blocked at the database rule level.",
    ],
  },
  {
    id: "scripts-audio",
    number: "02",
    title: "Scripts, Emotion Breakdown & Reference Audio",
    icon: FileAudio,
    accent: "text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/25",
    paragraphs: [
      "Text scripts, selected regional accents, and Story Multi-Emotion tags submitted in Voice Studio are transmitted securely to our synthesis API strictly to generate your speech output and track your character usage.",
      "If you record or upload Reference Audio for voice-profile calibration, that sample stays under your workspace control and is never sold, rented, or distributed to third-party advertising networks or unauthorized data brokers.",
    ],
  },
  {
    id: "library-cache",
    number: "03",
    title: "Cloud Audio Library & Local Browser Storage",
    icon: Database,
    accent: "text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/30 bg-fuchsia-50 dark:bg-fuchsia-950/25",
    paragraphs: [
      "Generated script records saved to your Cloud Audio Library are linked strictly to your private Firebase user ID (userId). No other creator can browse or access your private scripts or generation history.",
      "To give you instant playback and reliable Chrome MP3 downloads, Echo Clone caches synthesized MP3 audio locally in your browser's IndexedDB storage alongside session state tokens. We do not use invasive cross-site ad trackers.",
    ],
  },
  {
    id: "payments",
    number: "04",
    title: "Checkout & Payment Reference Records",
    icon: Receipt,
    accent: "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/25",
    paragraphs: [
      "When requesting a paid package upgrade via Checkout, Echo Clone only stores your selected plan ID, account email, package amount (PKR/USD), and the transaction reference number (TRX ID) you submit for admin approval.",
      "We do not collect, process, or store your debit/credit card numbers, banking passwords, or NayaPay PINs on Echo Clone Studio servers.",
    ],
  },
  {
    id: "security",
    number: "05",
    title: "Security Controls & Data Isolation",
    icon: Lock,
    accent: "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/25",
    paragraphs: [
      "All Studio synthesis requests verify your Firebase Authentication token on the server before running speech engines. Database access is governed by strict Firestore Security Rules ensuring per-user ownership isolation for profiles, notifications, payment records, and generations.",
      "Administrative overrides (such as verifying TRX payments or adjusting package limits) are restricted exclusively to verified ABM CodeSpace administrator accounts.",
    ],
  },
  {
    id: "rights-deletion",
    number: "06",
    title: "Data Retention, Deletion & Contact Requests",
    icon: Trash2,
    accent: "text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/25",
    paragraphs: [
      "You can delete saved voice generations directly from your Audio Library or clear local browser audio cache anytime from browser settings.",
      "To request full account deletion, username removal, or an export of your account records, contact the ABM CodeSpace team via email or WhatsApp Support using the verified contact details below.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-14 md:py-20 space-y-12">
      {/* Header */}
      <header className="space-y-4 border-b border-indigo-200 dark:border-indigo-500/20 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-500/35 bg-cyan-50 dark:bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
          Privacy & Data Protection · ABM CodeSpace
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          Your creative scripts, voice settings, and account details belong to you. This Privacy Policy explains how{" "}
          <strong className="text-slate-900 dark:text-white">Echo Clone Studio</strong> (by ABM CodeSpace) collects, protects, and handles your data alongside our{" "}
          <Link href="/terms" className="text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 underline underline-offset-4">
            Terms & Conditions
          </Link>
          .
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last updated: November 2026 · Echo Clone Studio (Developed by ABM CodeSpace)
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
            >
              Read Terms & Conditions
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition-all shadow-md shadow-violet-600/20"
            >
              Create Account <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Quick Navigation Index */}
      <nav
        aria-label="Privacy policy sections"
        className="rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-white/90 dark:bg-[#0b1024]/80 p-5 space-y-3 shadow-sm dark:shadow-none"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Privacy Breakdown
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {PRIVACY_SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/70 px-3 py-2 text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 hover:text-slate-950 dark:hover:text-white transition-colors"
            >
              <span className="font-mono text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                {sec.number}
              </span>
              <span className="truncate">{sec.title}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-5">
        {PRIVACY_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <section
              key={sec.id}
              id={sec.id}
              className="rounded-2xl border border-indigo-200 dark:border-indigo-500/25 bg-gradient-to-b from-white via-slate-50/70 to-white dark:from-[#101631]/90 dark:via-[#0b1024]/95 dark:to-[#080c1b] p-6 sm:p-7 space-y-3.5 scroll-mt-24 shadow-sm dark:shadow-none"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${sec.accent}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    Section {sec.number}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {sec.title}
                  </h2>
                </div>
              </div>

              <div className="space-y-2.5 pl-0 sm:pl-12">
                {sec.paragraphs.map((text, idx) => (
                  <p
                    key={idx}
                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    {text}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Contact Strip */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4" /> Privacy & Support Contact
        </div>
        <LiveSupportSummaryStrip />
      </section>
    </div>
  );
}
