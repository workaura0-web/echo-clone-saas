import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Echo Clone — Expressive AI Voice & Story Studio",
  description:
    "Transform scripts into lifelike regional accents and dynamic multi-emotion story narrations with synchronized user packages.",
  openGraph: {
    title: "Echo Clone — Expressive AI Voice & Story Studio",
    description:
      "Transform scripts into lifelike regional accents and dynamic multi-emotion story narrations.",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/echo-icon-512.png",
    apple: "/echo-icon-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "Echo Clone",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-violet-500/30 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}