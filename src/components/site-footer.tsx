"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { subscribeSupportSettings } from "@/lib/firebase/db";
import {
  DEFAULT_SUPPORT_SETTINGS,
  formatWhatsAppUrl,
  SupportSettings,
} from "@/lib/support";

const HIDDEN_FOOTER_PREFIXES = ["/studio", "/login", "/signup", "/reset-password", "/admin"];

export default function SiteFooter() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<SupportSettings>(
    DEFAULT_SUPPORT_SETTINGS
  );

  useEffect(() => {
    const unsub = subscribeSupportSettings((next) => {
      setSettings(next);
    });
    return () => unsub();
  }, []);

  if (
    pathname &&
    HIDDEN_FOOTER_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <footer className="border-t border-indigo-500/20 bg-[#060915]/95 text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Structured Multi-Column Footer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand & Direct Support Info */}
          <div className="md:col-span-5 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base font-extrabold tracking-tight text-white"
            >
              <span className="p-[1.5px] rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400">
                <Image
                  src="/echo-icon-192.png"
                  alt="Echo Clone Logo"
                  width={28}
                  height={28}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-[7px] object-cover block bg-slate-950"
                />
              </span>
              <span>
                <span className="text-white">Echo</span>{" "}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  Clone
                </span>
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Expressive AI voice synthesis and multi-emotion story narration studio across 140+ languages and 300+ human voices with instant Chrome MP3 exports.
            </p>

            <div className="space-y-2 pt-1 text-xs">
              <a
                href={`mailto:${settings.supportEmail}`}
                className="flex items-center gap-2 text-slate-300 hover:text-cyan-300 transition-colors w-fit"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{settings.supportEmail}</span>
              </a>
              <a
                href={formatWhatsAppUrl(settings.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-300 hover:text-emerald-300 transition-colors w-fit font-mono tabular-nums"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{settings.whatsappNumber}</span>
              </a>
            </div>
          </div>

          {/* Platform Links Column */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold text-white tracking-wide">
              Platform
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/studio/tts"
                  className="hover:text-cyan-300 transition-colors"
                >
                  Studio
                </Link>
              </li>
              <li>
                <Link
                  href="/library"
                  className="hover:text-violet-300 transition-colors"
                >
                  Library
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="hover:text-fuchsia-300 transition-colors"
                >
                  Packages
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-amber-300 transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-white tracking-wide">
              Company & Legal
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link
                  href="/about"
                  className="hover:text-cyan-300 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-emerald-300 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-violet-300 transition-colors"
                >
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-slate-200 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-slate-200 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Subtle Attribution Line */}
        <div className="pt-6 border-t border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© 2026 Echo Clone Studio. All rights reserved.</p>
          <p className="text-[11px] text-slate-500 tracking-wide">
            Developed by{" "}
            <Link
              href="/about"
              className="text-slate-300 hover:text-cyan-300 font-medium transition-colors"
            >
              ABM CodeSpace
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
