"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { subscribeSupportSettings } from "@/lib/firebase/db";
import {
  DEFAULT_SUPPORT_SETTINGS,
  formatWhatsAppUrl,
  SupportSettings,
} from "@/lib/support";

export default function FloatingWhatsApp() {
  const [settings, setSettings] = useState<SupportSettings>(
    DEFAULT_SUPPORT_SETTINGS
  );

  useEffect(() => {
    const unsub = subscribeSupportSettings((next) => {
      setSettings(next);
    });
    return () => unsub();
  }, []);

  const href = formatWhatsAppUrl(
    settings.whatsappNumber,
    "Assalam-o-Alaikum, I need support regarding Echo Clone Studio."
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp Support (${settings.whatsappNumber})`}
      title={`WhatsApp Support · ${settings.whatsappNumber}`}
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-lg shadow-emerald-950/60 ring-2 ring-white/20 hover:ring-white/40 transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60"
    >
      <span className="relative flex items-center justify-center">
        <MessageCircle className="w-6 h-6 sm:w-6.5 sm:h-6.5 fill-white text-white" />
        <Phone className="w-2.5 h-2.5 text-[#25D366] fill-[#25D366] absolute" />
      </span>
    </a>
  );
}
