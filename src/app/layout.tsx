import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

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

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "Echo Clone",
    "AI Text to Speech",
    "Multi-Emotion TTS",
    "Story Narration AI Voice",
    "US UK Australian Urdu AI Accent",
    "Expressive Voiceover Generator",
    "AI Voice Studio",
  ],
  authors: [{ name: "ABM", url: SITE_URL }],
  creator: "Echo Clone Studio",
  publisher: "Echo Clone",
  applicationName: SITE_NAME,
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: "google60f8c6164af2f9f8",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-banner.jpg`,
        width: 1200,
        height: 630,
        alt: "Echo Clone — Expressive AI Voice & Multi-Emotion Story Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [`${SITE_URL}/og-banner.jpg`],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/echo-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/echo-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
};

const structuredGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/echo-icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: DEFAULT_TITLE,
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript",
      description: DEFAULT_DESCRIPTION,
      image: `${SITE_URL}/og-banner.jpg`,
      publisher: { "@id": `${SITE_URL}/#organization` },
      featureList: [
        "140+ regional locales and 300+ distinct Male & Female neural voices with Auto-Detect",
        "Automatic sentence-by-sentence Story Emotion Director (Angry, Laughing, Humorous, Sad, Whispering, Excited)",
        "Reference audio voice profile studio with Chrome MP3 export and synced Audio Library",
        "Live Admin-managed PKR packages (Starter, Creator, Pro, Business) with real-time quota alerts",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Starter Free",
          price: "0",
          priceCurrency: "PKR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Starter",
          price: "2000",
          priceCurrency: "PKR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Creator",
          price: "5000",
          priceCurrency: "PKR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "7000",
          priceCurrency: "PKR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Business",
          price: "10000",
          priceCurrency: "PKR",
          availability: "https://schema.org/InStock",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans echo-studio-canvas text-slate-100 min-h-screen flex flex-col antialiased selection:bg-fuchsia-500/30 selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredGraph) }}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}