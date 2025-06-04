import type { Metadata } from "next"

// Base URL for the site - update this when deployed
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://accalyum.xyz"

// Default metadata for the site
export const defaultMetadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "YUM - Youth Uprising Movement",
    template: "%s | YUM",
  },
  description:
    "A community-driven socialist token built on the Alephium blockchain, designed to empower social causes and mutual aid.",
  keywords: [
    "YUM",
    "Alephium",
    "blockchain",
    "cryptocurrency",
    "token",
    "socialist",
    "community",
    "mutual aid",
    "social causes",
  ],
  authors: [{ name: "YUM Community" }],
  creator: "YUM Community",
  publisher: "YUM Network",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "ja_JP",
    url: baseUrl,
    siteName: "YUM Network",
    title: "YUM - Youth Uprising Movement",
    description:
      "A community-driven socialist token built on the Alephium blockchain, designed to empower social causes and mutual aid.",
    images: [
      {
        url: `${baseUrl}/images/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "YUM Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YUM - Youth Uprising Movement",
    description:
      "A community-driven socialist token built on the Alephium blockchain, designed to empower social causes and mutual aid.",
    images: [`${baseUrl}/images/twitter-image.jpg`],
    creator: "@yum_network",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/images/favicon-192x192.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/images/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        url: "/images/favicon-16x16.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        url: "/images/favicon-192x192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        url: "/images/favicon-512x512.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      "en-US": `${baseUrl}/en`,
      "ja-JP": `${baseUrl}/ja`,
    },
  },
}

// Generate metadata for specific pages
export function generateMetadata({
  title,
  description,
  path,
  ogImage,
}: {
  title?: string
  description?: string
  path?: string
  ogImage?: string
}): Metadata {
  const url = path ? `${baseUrl}/${path}` : baseUrl
  const ogImageUrl = ogImage || `${baseUrl}/images/og-image.jpg`

  return {
    ...defaultMetadata,
    title: title || defaultMetadata.title,
    description: description || (defaultMetadata.description as string),
    alternates: {
      canonical: url,
      languages: {
        "en-US": `${baseUrl}/en${path ? `/${path}` : ""}`,
        "ja-JP": `${baseUrl}/ja${path ? `/${path}` : ""}`,
      },
    },
    openGraph: {
      ...defaultMetadata.openGraph,
      url,
      title: title || (defaultMetadata.openGraph?.title as string),
      description: description || (defaultMetadata.openGraph?.description as string),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title || "YUM Network",
        },
      ],
    },
    twitter: {
      ...defaultMetadata.twitter,
      title: title || (defaultMetadata.twitter?.title as string),
      description: description || (defaultMetadata.twitter?.description as string),
      images: [ogImageUrl],
    },
  }
}