import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https")
  ? process.env.NEXT_PUBLIC_APP_URL
  : COMPANY.siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/pilot", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
