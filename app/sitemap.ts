import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https")
  ? process.env.NEXT_PUBLIC_APP_URL
  : COMPANY.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  });

  return [
    entry("", 1.0),
    entry("/booking", 0.9),
    entry("/mungyeong", 0.8),
    entry("/why-mungyeong", 0.8),
    entry("/review", 0.6),
    entry("/terms", 0.2),
    entry("/privacy", 0.2),
    entry("/refund", 0.2),
  ];
}
