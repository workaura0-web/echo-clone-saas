import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://echoclonevoice.vercel.app";

export const SITE_NAME = "Echo Clone";

export const DEFAULT_TITLE =
  "Echo Clone – Expressive AI Voice & Multi-Emotion TTS Studio";

export const DEFAULT_DESCRIPTION =
  "Turn scripts into lifelike US, UK, Australian & Urdu voices with Echo Clone. Automatic story emotions, WAV export, and synced creator packages.";

export function buildPageMetadata({
  title,
  description,
  path = "/",
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const canonicalUrl = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
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
      siteName: SITE_NAME,
      url: canonicalUrl,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [
        {
          url: `${SITE_URL}/og-banner.jpg`,
          width: 1200,
          height: 630,
          alt: "Echo Clone AI Voice & Multi-Emotion Story Studio",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [`${SITE_URL}/og-banner.jpg`],
    },
  };
}
