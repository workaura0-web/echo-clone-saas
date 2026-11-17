import { buildPageMetadata } from "@/lib/seo";
import { LiveSupportSummaryStrip } from "@/components/live-contact-links";

export const metadata = buildPageMetadata({
  title: "Terms of Service – Echo Clone Studio",
  description:
    "Terms of Service for Echo Clone AI Voice Studio developed by ABM CodeSpace. Contact codeabm71@gmail.com or +1 (401) 572-1696.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 space-y-10">
      <div className="space-y-3 border-b border-indigo-500/20 pb-6">
        <p className="text-xs font-semibold text-violet-300">
          Legal & Licensing · ABM CodeSpace
        </p>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400">
          Last updated: November 2026 · Echo Clone Studio (Developed by ABM CodeSpace)
        </p>
      </div>

      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Studio Usage & Credits</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Echo Clone allocates monthly character credits according to your active package (Starter Free, Starter, Creator, Pro, or Business). Credits refresh upon plan renewal or admin verification.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Commercial Rights</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Paid packages include commercial usage rights for YouTube videos, podcasts, audiobooks, courses, ads, and client deliveries. Responsible and lawful voice content guidelines apply to all scripts generated on the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Responsible Voice Ethics</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Users agree not to use synthesized voices for impersonation fraud, harassment, or deceptive activity. When using custom reference audio profiles, ensure you hold permission for the reference sample used.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Support & Billing Contact</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Echo Clone is developed and operated by ABM CodeSpace. Reach our team directly for billing assistance, account upgrades, or enterprise terms.
          </p>
        </section>
      </div>

      <LiveSupportSummaryStrip />
    </div>
  );
}
