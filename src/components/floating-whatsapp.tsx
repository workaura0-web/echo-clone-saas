"use client";

import { useAppState } from "@/components/app-state-provider";
import { formatWhatsAppUrl } from "@/lib/support";
import { WhatsAppOriginalIcon } from "@/components/brand-social-icons";

export default function FloatingWhatsApp() {
  const { supportSettings: settings } = useAppState();

  const href = formatWhatsAppUrl(
    settings.whatsappNumber,
    "Assalam-o-Alaikum, I need support regarding Echo Clone Studio."
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Support"
      title="WhatsApp Support"
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-lg shadow-emerald-600/30 dark:shadow-emerald-950/60 ring-2 ring-slate-900/10 dark:ring-white/20 hover:ring-slate-900/20 dark:hover:ring-white/40 transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60"
    >
      <WhatsAppOriginalIcon className="w-full h-full" />
    </a>
  );
}
