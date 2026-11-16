import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sign In",
  description:
    "Sign in to your Echo Clone Studio account to manage your voice package, character quota, and saved audio library.",
  path: "/login",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
