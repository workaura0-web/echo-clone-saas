import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{
    path: string;
    changeFrequency: "daily" | "weekly" | "monthly";
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/studio/tts", changeFrequency: "daily", priority: 0.95 },
    { path: "/checkout", changeFrequency: "weekly", priority: 0.9 },
    { path: "/library", changeFrequency: "weekly", priority: 0.8 },
    { path: "/signup", changeFrequency: "monthly", priority: 0.7 },
    { path: "/login", changeFrequency: "monthly", priority: 0.6 },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
