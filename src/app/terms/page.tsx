import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  FileText,
  Globe2,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { LiveSupportSummaryStrip } from "@/components/live-contact-links";

export const metadata = buildPageMetadata({
  title: "Terms & Conditions – Echo Clone Studio",
  description:
    "Terms & Conditions for Echo Clone AI Voice & Multi-Emotion TTS Studio developed by ABM CodeSpace. Learn about credits, commercial licensing, voice cloning ethics, and billing.",
  path: "/terms",
});

const TERMS_SECTIONS = [
  {
    id: "acceptance",
    number: "01",
    title: "Acceptance of Terms & Account Eligibility",
    icon: UserCheck,
    accent: "text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/25",
    paragraphs: [
      "By creating an account, ticking the Terms & Conditions acceptance checkbox on Sign Up, or accessing Echo Clone Studio (developed and operated by ABM CodeSpace), you agree to be bound by these Terms & Conditions and our Privacy Policy.",
      "To generate custom audio in Voice Studio, save recordings to your Cloud Audio Library, or purchase character credit packages, you must register a valid account using Google Sign-In or an email address paired with a unique @username handle. You are responsible for safeguarding your login credentials and all activity conducted under your account.",
    ],
  },
  {
    id: "studio-access",
    number: "02",
    title: "Platform Services, Languages & Studio Exports",
    icon: Globe2,
    accent: "text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/25",
    paragraphs: [
      "Echo Clone Studio provides AI text-to-speech synthesis, Story Multi-Emotion sentence acting, Auto-Detect regional accents across 140+ languages and 300+ male and female voices, Reference Audio voice-profile styling, and Chrome-compatible MP3 exports.",
      "Unauthenticated visitors may audition only the pre-built sample previews on the homepage. Full custom script synthesis and API routes require an active authenticated session and sufficient character quota.",
    ],
  },
  {
    id: "credits-billing",
    number: "03",
    title: "Subscription Packages, Character Credits & Validity",
    icon: Sparkles,
    accent: "text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/30 bg-fuchsia-50 dark:bg-fuchsia-950/25",
    paragraphs: [
      "Monthly character credits, per-generation character limits, and library storage limits are allocated according to your active package (Starter Free, Starter, Creator, Pro, Business, or Enterprise) as published live on our Pricing and Checkout pages in PKR and USD.",
      "Characters are deducted per generation based on the length of your submitted script. Each subscription operates on its stated validity cycle (typically 30 days from activation). Unused character credits expire at the end of each billing cycle unless your package is renewed or upgraded.",
    ],
  },
  {
    id: "payments-refunds",
    number: "04",
    title: "Manual Payment Verification & Refund Policy",
    icon: CreditCard,
    accent: "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/25",
    paragraphs: [
      "Paid packages submitted via NayaPay or bank transfer require accurate transaction reference details (TRX ID) at Checkout. Paid quotas activate once our support team verifies the transaction.",
      "Because neural speech synthesis consumes real-time server compute immediately upon generation, character credits that have already been consumed are non-refundable. If you accidentally send a duplicate payment or experience an unactivated transfer, contact ABM CodeSpace within 7 days via WhatsApp Support or email with your TRX ID for resolution.",
    ],
  },
  {
    id: "commercial-rights",
    number: "05",
    title: "Commercial Usage Rights & Content Ownership",
    icon: BadgeCheck,
    accent: "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/25",
    paragraphs: [
      "Active paid packages (Starter, Creator, Pro, Business, and Enterprise) include commercial licensing rights for monetized YouTube channels, podcasts, audiobooks, online courses, client deliveries, advertisements, and social media campaigns.",
      "The Starter Free tier (10,000 characters) is strictly provided for personal evaluation, quality testing, and non-commercial creative trials. You retain ownership of the original scripts you write and remain solely responsible for ensuring your published audio complies with copyright and platform regulations.",
    ],
  },
  {
    id: "voice-ethics",
    number: "06",
    title: "Voice Cloning Ethics & Prohibited Conduct",
    icon: ShieldAlert,
    accent: "text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/25",
    paragraphs: [
      "You must only upload or record Reference Audio samples that belong to you or for which you hold explicit, verifiable permission from the speaker. Cloning the voice of any individual without consent is strictly prohibited.",
      "You agree NOT to use Echo Clone Studio for financial or OTP scams, identity impersonation, deepfake misinformation, harassment, hate speech, illegal content, or automated bot scraping designed to bypass character quotas. Violations may result in immediate account suspension without refund.",
    ],
  },
  {
    id: "intellectual-property",
    number: "07",
    title: "Intellectual Property & Service Availability",
    icon: Scale,
    accent: "text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/25",
    paragraphs: [
      "All platform code, visual design, brand trademarks (Echo Clone Studio & ABM CodeSpace), voice presets, and workflow systems remain the intellectual property of ABM CodeSpace.",
      "While we maintain high availability and real-time failover across speech engines, service uptime may occasionally be affected by scheduled maintenance or upstream speech infrastructure updates. Echo Clone is provided on an 'as-available' basis without liability for indirect or consequential losses.",
    ],
  },
  {
    id: "updates-contact",
    number: "08",
    title: "Amendments & Support Contact",
    icon: FileText,
    accent: "text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-950/25",
    paragraphs: [
      "ABM CodeSpace may update these Terms & Conditions to reflect new studio features, pricing structures, or legal compliance requirements. Updates take effect immediately upon publication on this page.",
      "For licensing inquiries, custom enterprise plans, payment assistance, or policy questions, reach our team directly through the verified support channels below.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-14 md:py-20 space-y-12">
      {/* Header */}
      <header className="space-y-4 border-b border-indigo-200 dark:border-indigo-500/20 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-500/35 bg-violet-50 dark:bg-violet-950/40 px-3.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-300" />
          Legal & Compliance · ABM CodeSpace
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Terms & Conditions
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          Please read these Terms & Conditions carefully before registering or synthesizing voices on{" "}
          <strong className="text-slate-900 dark:text-white">Echo Clone Studio</strong>. Creating an account requires your explicit acceptance of these terms and our{" "}
          <Link href="/privacy" className="text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last updated: November 2026 · Echo Clone Studio (Developed by ABM CodeSpace)
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
            >
              Read Privacy Policy
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
        aria-label="Terms sections"
        className="rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-white/90 dark:bg-[#0b1024]/80 p-5 space-y-3 shadow-sm dark:shadow-none"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Quick Section Overview
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {TERMS_SECTIONS.map((sec) => (
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
        {TERMS_SECTIONS.map((sec) => {
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
          <ShieldCheck className="w-4 h-4" /> Direct Support & Licensing Contact
        </div>
        <LiveSupportSummaryStrip />
      </section>
    </div>
  );
}
