import type { MetadataRoute } from "next";
import { source, blog, pulse } from "@/lib/source";

const BASE_URL = "https://www.fiber.world";

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL },
    { url: `${BASE_URL}/blog` },
    { url: `${BASE_URL}/showcase` },
  ];

  // Documentation pages from Fumadocs source
  const docPages: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.data.date,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const posts: MetadataRoute.Sitemap = [...blog.getPages(), ...pulse.getPages()].map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.data.date,
  }));

  return [...staticPages, ...docPages, ...posts];
}
