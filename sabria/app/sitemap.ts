import type { MetadataRoute } from "next";
import { getActivities } from "@/lib/data/activities";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/activities", priority: 0.9 },
    { path: "/gallery", priority: 0.7 },
    { path: "/about", priority: 0.7 },
    { path: "/safety", priority: 0.6 },
    { path: "/contact", priority: 0.6 },
    { path: "/legal/privacy", priority: 0.2 },
    { path: "/legal/terms", priority: 0.2 },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: `${site.url}${r.path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: r.priority,
    })),
    ...getActivities().map((a) => ({
      url: `${site.url}/activities/${a.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
