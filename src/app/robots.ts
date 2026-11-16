import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/studio/tts", "/checkout", "/library", "/login", "/signup"],
        disallow: ["/api/", "/admin/", "/dashboard", "/reset-password", "/auth/"],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/studio/tts", "/checkout", "/llms.txt"],
        disallow: ["/api/", "/admin/", "/dashboard"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
