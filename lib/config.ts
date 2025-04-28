// Environment variables configuration
export const config = {
  alephium: {
    network: process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || "mainnet",
    providerUrl: process.env.NEXT_PUBLIC_ALEPHIUM_PROVIDER_URL || "https://node.alphaga.app",
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "",
    acyumTokenId: process.env.NEXT_PUBLIC_ACYUM_TOKEN_ID || "",
    adminAddress: process.env.ADMIN_ALEPHIUM_ADDRESS || "",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "31a36ede551882a3a3147483688a9978",
  },
  treasury: {
    homelessness: process.env.TREASURY_HOMELESSNESS || "",
    palestine: process.env.TREASURY_PALESTINE || "",
    communist: process.env.TREASURY_COMMUNIST || "",
  },
  database: {
    mongoUri: process.env.MONGODB_URI || "",
    mongoDb: process.env.MONGODB_DB || "",
  },
  storage: {
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || "",
  },
}

// Site configuration for metadata
export const siteConfig = {
  name: "ACYUM Network",
  description:
    "A community-driven socialist token built on the Alephium blockchain, designed to empower social causes and mutual aid.",
  url: "https://accalyum.xyz",
  ogImage: "https://accalyum.xyz/images/og-image.jpg",
  links: {
    twitter: "https://twitter.com/acyum_network",
    github: "https://github.com/acyum",
  },
}
