import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Account Dashboard",
  description: "Monitor your Echo Clone package status, character usage, and expiry notifications.",
  path: "/dashboard",
  noIndex: true,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
