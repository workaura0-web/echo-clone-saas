import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin Control Panel",
  description: "Administrative package and payment management for Echo Clone.",
  path: "/admin/payment",
  noIndex: true,
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
