import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Reset Password",
  description: "Update your Echo Clone account password.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
