import { buildPageMetadata } from "@/lib/seo";
import { LiveContactWorkspace } from "@/components/live-contact-links";

export const metadata = buildPageMetadata({
  title: "Contact Us – Echo Clone & ABM CodeSpace Support",
  description:
    "Contact Echo Clone and ABM CodeSpace support at codeabm71@gmail.com or WhatsApp +1 (401) 572-1696 for billing, technical help, and enterprise inquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs font-semibold tracking-wide bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
          Support & Inquiries · ABM CodeSpace
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight [text-wrap:balance]">
          Contact Echo Clone Studio
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          Have a question about voice credits, PKR package verification, custom voice cloning, or software partnerships with ABM CodeSpace? Reach us directly via email, WhatsApp, or the form below.
        </p>
      </div>

      <LiveContactWorkspace />
    </div>
  );
}
