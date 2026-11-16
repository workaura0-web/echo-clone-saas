import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Audio Library – Saved AI Voiceovers & Stories",
  description:
    "Replay, filter by delivery tone, inspect sentence-level emotions, and download your generated Echo Clone WAV audio clips.",
  path: "/library",
});

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
