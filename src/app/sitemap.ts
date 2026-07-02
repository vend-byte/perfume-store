import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
  ];
}
