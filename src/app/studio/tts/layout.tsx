import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "AI Voice Studio – Regional Accents & Multi-Emotion TTS",
  description:
    "Generate expressive US, UK, Australian, Canadian, and Urdu voices with automatic multi-emotion story direction and studio WAV export.",
  path: "/studio/tts",
});

export default function TTSStudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
