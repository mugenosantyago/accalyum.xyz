import type { MetadataRoute } from "next"

// Base URL for the site - update this when deployed
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://accalyum.xyz"

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/id-registration",
    "/acyum-bank",
    "/acyum-swap",
    "/mutual-funding",
    "/bank",
    "/transactions",
    "/register",
  ]

  const sitemap: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }))

  return sitemap
}
