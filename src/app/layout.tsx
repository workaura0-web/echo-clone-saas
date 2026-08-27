import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Echo Clone SaaS",
  description: "AI Voice Generator and Voice Cloning Platform",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/echo-icon.svg",
    apple: "/echo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-white min-h-screen flex flex-col`}>
        {/* Top Navigation Bar */}
        <Navbar />

        {/* Active Page Content */}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}