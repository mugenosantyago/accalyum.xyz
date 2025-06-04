import Script from "next/script"

export function GlobalStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://accalyum.xyz"

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Accalyum Network",
    url: baseUrl,
    logo: `${baseUrl}/images/logo.png`,
    sameAs: ["https://x.com/alephionline", "https://discord.gg/yum"],
    description:
      "A community-driven socialist token built on the Alephium blockchain, designed to empower social causes and mutual aid.",
  }

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "ID Registration",
        item: `${baseUrl}/id-registration`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "YUM Bank",
        item: `${baseUrl}/yum-bank`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Trade Tokens",
        item: `${baseUrl}/trade-tokens`,
      },
      {
        "@type": "ListItem",
        position: 5,
        name: "Mutual Funding",
        item: `${baseUrl}/mutual-funding`,
      },
      {
        "@type": "ListItem",
        position: 6,
        name: "Tokens",
        item: `${baseUrl}/bank`,
      },
      {
        "@type": "ListItem",
        position: 7,
        name: "Transactions",
        item: `${baseUrl}/transactions`,
      },
    ],
  }

  return (
    <>
      <Script
        id="organization-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
    </>
  )
}
