// Environment variables configuration
export const config = {
  alephium: {
    network: process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || "mainnet",
    providerUrl: process.env.NEXT_PUBLIC_ALEPHIUM_PROVIDER_URL || (process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK === "testnet" ? "https://wallet.testnet.alephium.org" : "https://wallet.mainnet.alephium.org"),
    // Renamed for clarity, holds the Contract Address (Base58) used by APIs like CandySwap
    acyumContractAddress: process.env.NEXT_PUBLIC_ACYUM_CONTRACT_ADDRESS || "", 
    // Added to store the actual Alephium Token ID (Hex)
    acyumTokenIdHex: process.env.NEXT_PUBLIC_ACYUM_TOKEN_ID_HEX || "", 
    acyumDecimals: parseInt(process.env.NEXT_PUBLIC_ACYUM_DECIMALS || "7"), // Add decimals, default to 7
    adminAddress: process.env.ADMIN_ADDRESS || "",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    // Add sWEA config 
    sweaTokenIdHex: process.env.NEXT_PUBLIC_SWEA_TOKEN_ID_HEX || undefined, // Default to undefined if not set
    sweaDecimals: parseInt(process.env.NEXT_PUBLIC_SWEA_DECIMALS || "18"), // Default 18?
    sweaContractAddress: process.env.NEXT_PUBLIC_SWEA_CONTRACT_ADDRESS || undefined, // Default to undefined if not set
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
