import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Packages & Pricing – Starter Free, Creator Pro & Studio Enterprise",
  description:
    "Compare Echo Clone monthly TTS plans. Start free with 10,000 characters or upgrade to unlock all 6 regional accents and Story Multi-Emotion mode.",
  path: "/checkout",
});

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
