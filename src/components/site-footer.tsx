"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppState } from "@/components/app-state-provider";
import {
  DEFAULT_SUPPORT_SETTINGS,
  formatWhatsAppUrl,
} from "@/lib/support";
import {
  FacebookOriginalIcon,
  GmailOriginalIcon,
  WhatsAppOriginalIcon,
} from "@/components/brand-social-icons";

const HIDDEN_FOOTER_PREFIXES = ["/studio", "/login", "/signup", "/reset-password", "/admin"];

export default function SiteFooter() {
  const pathname = usePathname();
  const { supportSettings: settings } = useAppState();

  if (
    pathname &&
    HIDDEN_FOOTER_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <footer className="border-t border-[var(--echo-border)] bg-[var(--echo-footer-bg)] text-slate-600 dark:text-slate-300 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Structured Multi-Column Footer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand & Compact Social / Support Icons */}
          <div className="md:col-span-5 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base font-extrabold tracking-tight text-slate-900 dark:text-white"
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
                <span className="text-slate-900 dark:text-white">Echo</span>{" "}
                <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 dark:from-violet-300 dark:via-fuchsia-300 dark:to-cyan-300 bg-clip-text text-transparent">
                  Clone
                </span>
              </span>
            </Link>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              Expressive AI voice synthesis and multi-emotion story narration studio across 140+ languages and 300+ human voices with instant Chrome MP3 exports.
            </p>

            {/* Clean Icon-Only Support & Social Links (No Raw Phone/Email Text) */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href={formatWhatsAppUrl(settings.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Support"
                title="WhatsApp Support"
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-400 transition-transform duration-200 hover:-translate-y-0.5 shadow-sm"
              >
                <WhatsAppOriginalIcon className="w-5 h-5" />
              </a>

              <a
                href={`mailto:${settings.supportEmail}`}
                aria-label="Gmail Support"
                title="Send Email"
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-cyan-400 transition-transform duration-200 hover:-translate-y-0.5 shadow-sm"
              >
                <GmailOriginalIcon className="w-5 h-5" />
              </a>

              <a
                href={settings.facebookUrl || DEFAULT_SUPPORT_SETTINGS.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ABM CodeSpace Facebook Page"
                title="Facebook Page"
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-sky-200 dark:border-sky-500/30 bg-white dark:bg-slate-900/80 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:border-sky-400 transition-transform duration-200 hover:-translate-y-0.5 shadow-sm"
              >
                <FacebookOriginalIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Platform Links Column */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
              Platform
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  href="/studio/tts"
                  className="hover:text-violet-700 dark:hover:text-cyan-300 transition-colors"
                >
                  Studio
                </Link>
              </li>
              <li>
                <Link
                  href="/library"
                  className="hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  Library
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="hover:text-fuchsia-700 dark:hover:text-fuchsia-300 transition-colors"
                >
                  Packages
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
              Company & Legal
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  href="/about"
                  className="hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-slate-950 dark:hover:text-slate-200 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-slate-950 dark:hover:text-slate-200 transition-colors"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Subtle Attribution Line */}
        <div className="pt-6 border-t border-slate-200 dark:border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 Echo Clone Studio. All rights reserved.</p>
          <p className="text-[11px] text-slate-500 tracking-wide">
            Developed by{" "}
            <Link
              href="/about"
              className="text-slate-700 dark:text-slate-300 hover:text-violet-700 dark:hover:text-cyan-300 font-medium transition-colors"
            >
              ABM CodeSpace
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
