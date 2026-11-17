import { buildPageMetadata } from "@/lib/seo";
import { LiveSupportSummaryStrip } from "@/components/live-contact-links";

export const metadata = buildPageMetadata({
  title: "Privacy Policy – Echo Clone Studio",
  description:
    "Privacy Policy for Echo Clone AI Voice Studio developed by ABM CodeSpace. Contact codeabm71@gmail.com or +1 (401) 572-1696.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 space-y-10">
      <div className="space-y-3 border-b border-indigo-500/20 pb-6">
        <p className="text-xs font-semibold text-cyan-300">
          Legal & Trust · ABM CodeSpace
        </p>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400">
          Last updated: November 2026 · Echo Clone Studio (Developed by ABM CodeSpace)
        </p>
      </div>

      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            When you create an account on Echo Clone Studio, we store your authentication email, display name, active subscription quota, and saved audio generation history in your private cloud account so you can access your clips and MP3 exports across sessions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Scripts & Audio Data</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Scripts submitted for synthesis are processed strictly to generate your speech audio and sentence emotion breakdown. Audio saved to your Audio Library remains private to your account and can be deleted by you at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Payments & Verification</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Package activation requests record only your selected plan ID, email, and submitted transaction reference number (TRX ID) for manual verification by our support team.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Contact & Data Requests</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            For account removal, privacy inquiries, or support, contact the ABM CodeSpace team anytime using the verified details below.
          </p>
        </section>
      </div>

      <LiveSupportSummaryStrip />
    </div>
  );
}
