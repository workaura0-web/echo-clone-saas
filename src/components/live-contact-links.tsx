"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Building2,
} from "lucide-react";
import { subscribeSupportSettings } from "@/lib/firebase/db";
import {
  DEFAULT_SUPPORT_SETTINGS,
  formatWhatsAppUrl,
  normalizeWhatsAppDigits,
  SupportSettings,
} from "@/lib/support";
import {
  FacebookOriginalIcon,
  GmailOriginalIcon,
  WhatsAppOriginalIcon,
} from "@/components/brand-social-icons";

export function useLiveSupportSettings() {
  const [settings, setSettings] = useState<SupportSettings>(
    DEFAULT_SUPPORT_SETTINGS
  );

  useEffect(() => {
    const unsub = subscribeSupportSettings((next) => {
      setSettings(next);
    });
    return () => unsub();
  }, []);

  return settings;
}

export function LiveSupportSummaryStrip() {
  const settings = useLiveSupportSettings();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <a
        href={`mailto:${settings.supportEmail}`}
        className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-[#0d1328] to-[#090d1c] p-5 space-y-1.5 hover:border-cyan-400/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
          <Mail className="w-4 h-4" /> Support Email
        </div>
        <p className="text-sm font-bold text-white break-all">
          {settings.supportEmail}
        </p>
        <p className="text-xs text-slate-400">
          Direct support & licensing inquiries
        </p>
      </a>

      <a
        href={formatWhatsAppUrl(settings.whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-[#0d1328] to-[#090d1c] p-5 space-y-1.5 hover:border-emerald-400/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <Phone className="w-4 h-4" /> WhatsApp & Phone
        </div>
        <p className="text-sm font-bold text-white font-mono tabular-nums">
          {settings.whatsappNumber}
        </p>
        <p className="text-xs text-slate-400">
          Fast creator support & package help
        </p>
      </a>

      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 via-[#0d1328] to-[#090d1c] p-5 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
          <Building2 className="w-4 h-4" /> Software House
        </div>
        <p className="text-sm font-bold text-white">{settings.companyName}</p>
        <p className="text-xs text-slate-400">
          Product engineering & AI voice systems
        </p>
      </div>
    </div>
  );
}

export function LiveContactWorkspace() {
  const settings = useLiveSupportSettings();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Voice Studio & Account Support");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg("Please fill in your name, email address, and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setSubmitted(true);
  };

  const compiledText = `Name: ${name.trim()}\nEmail: ${email.trim()}\nTopic: ${topic}\n\n${message.trim()}`;
  const mailtoHref = `mailto:${settings.supportEmail}?subject=${encodeURIComponent(
    `[Echo Clone Support] ${topic}`
  )}&body=${encodeURIComponent(compiledText)}`;
  const waHref = `https://wa.me/${normalizeWhatsAppDigits(
    settings.whatsappNumber
  )}?text=${encodeURIComponent(compiledText)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Direct Contact Channels */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 via-[#0d1328] to-[#090d1c] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <Mail className="w-4 h-4" /> Official Email
            </span>
            <button
              type="button"
              onClick={() => handleCopy(settings.supportEmail, "email")}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
              aria-label="Copy support email"
            >
              {copiedKey === "email" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div>
            <a
              href={`mailto:${settings.supportEmail}`}
              className="text-base font-bold text-white hover:text-cyan-300 transition-colors break-all"
            >
              {settings.supportEmail}
            </a>
            <p className="text-xs text-slate-400 mt-1">
              Reach out for technical help, billing verification, or custom enterprise integration by {settings.companyName}.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 via-[#0d1328] to-[#090d1c] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Phone className="w-4 h-4" /> WhatsApp Support & Phone
            </span>
            <button
              type="button"
              onClick={() => handleCopy(settings.whatsappNumber, "phone")}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
              aria-label="Copy WhatsApp number"
            >
              {copiedKey === "phone" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div>
            <p className="text-base font-bold text-white font-mono tabular-nums">
              {settings.whatsappNumber}
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Instant assistance for package activation, NayaPay TRX approvals, and studio onboarding.
            </p>
            <a
              href={formatWhatsAppUrl(
                settings.whatsappNumber,
                "Hello ABM CodeSpace team, I would like assistance with Echo Clone Studio."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-950/30 via-[#0d1328] to-[#090d1c] p-6 space-y-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
            <Building2 className="w-4 h-4" /> Engineered By
          </span>
          <p className="text-base font-bold text-white">{settings.companyName}</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Echo Clone is designed, engineered, and maintained by {settings.companyName}, building creator-grade AI voice synthesis and web software products.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <a
              href={formatWhatsAppUrl(settings.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-emerald-500/30 bg-slate-900/80 hover:bg-emerald-950/50 transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppOriginalIcon className="w-5 h-5" />
            </a>
            <a
              href={`mailto:${settings.supportEmail}`}
              aria-label="Gmail"
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-rose-500/30 bg-slate-900/80 hover:bg-slate-800 transition-transform hover:-translate-y-0.5"
            >
              <GmailOriginalIcon className="w-5 h-5" />
            </a>
            <a
              href={settings.facebookUrl || DEFAULT_SUPPORT_SETTINGS.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Page"
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-sky-500/30 bg-slate-900/80 hover:bg-sky-950/50 transition-transform hover:-translate-y-0.5"
            >
              <FacebookOriginalIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Contact Inquiry Form */}
      <div className="lg:col-span-7 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-[#121735]/90 via-[#0d1229]/95 to-[#090d1e] p-6 md:p-8 space-y-5">
        <div className="space-y-1 border-b border-indigo-500/20 pb-4">
          <h2 className="text-lg font-bold text-white">Send a Direct Message</h2>
          <p className="text-xs text-slate-400">
            Compose your message below and send it immediately via email or WhatsApp.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {submitted ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Your Inquiry Is Ready to Send
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Choose your preferred channel below to dispatch your message directly to our team at {settings.companyName}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-slate-950 text-xs font-bold whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" /> Send via WhatsApp
              </a>
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:brightness-110 text-white text-xs font-semibold whitespace-nowrap"
              >
                <Mail className="w-4 h-4" /> Open Email App
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300"
              >
                Write Another Message
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium block">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ali Raza"
                  className="w-full rounded-xl border border-indigo-500/25 bg-slate-950/90 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-indigo-500/25 bg-slate-950/90 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-indigo-500/25 bg-slate-950/90 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Voice Studio & Account Support">
                  Voice Studio & Account Support
                </option>
                <option value="Package Upgrade & NayaPay Verification">
                  Package Upgrade & NayaPay Verification
                </option>
                <option value="Custom Enterprise & Agency Plan">
                  Custom Enterprise & Agency Plan
                </option>
                <option value="ABM CodeSpace Software & Partnership">
                  ABM CodeSpace Software & Partnership
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">Message</label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us how we can help..."
                className="w-full rounded-xl border border-indigo-500/25 bg-slate-950/90 p-3.5 text-sm text-white leading-relaxed focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 text-white text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all whitespace-nowrap"
            >
              <Send className="w-4 h-4" /> Prepare Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
