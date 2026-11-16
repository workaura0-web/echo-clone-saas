import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Create Free Account",
  description:
    "Create your free Echo Clone account with 10,000 monthly characters for expressive multi-accent AI voice generation.",
  path: "/signup",
});

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
