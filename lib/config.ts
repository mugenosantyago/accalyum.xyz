// Environment variables configuration
export const config = {
  siteName: "ACYUM",
  siteDescription: "ACYUM - Community Driven Token on Alephium",
  siteUrl: "https://your-app-url.com", // Replace with your actual URL
  githubUrl: "https://github.com/your-repo", // Replace with your repo URL
  twitterUrl: "https://twitter.com/your-profile", // Replace with your profile URL

  alephium: {
    network: (process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || "testnet") as "mainnet" | "testnet" | "devnet",
    nodeUrl: process.env.NEXT_PUBLIC_NODE_URL,
    providerUrl: process.env.NEXT_PUBLIC_NODE_PROVIDER_URL, // Separate provider URL if needed
    explorerApiUrl: process.env.NEXT_PUBLIC_EXPLORER_API_URL,
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,

    acyumTokenIdHex: process.env.NEXT_PUBLIC_ACYUM_TOKEN_ID_HEX ?? "", // Default to empty string if not set
    acyumDecimals: parseInt(process.env.NEXT_PUBLIC_ACYUM_DECIMALS || "7", 10),
    
    // sWEA Configuration
    sweaTokenIdHex: process.env.NEXT_PUBLIC_SWEA_TOKEN_ID_HEX ?? "5d738e4fda3dab2c3edf175842df94f877f4be41b06bba553f61328b5c276300", // Updated with provided ID
    sweaDecimals: parseInt(process.env.NEXT_PUBLIC_SWEA_DECIMALS || "9", 10), // Updated to 9 decimals
    // Add contract addresses here when known
    // sweaClaimContractAddress: process.env.NEXT_PUBLIC_SWEA_CLAIM_CONTRACT_ADDRESS,
    // sweaPurchaseContractAddress: process.env.NEXT_PUBLIC_SWEA_PURCHASE_CONTRACT_ADDRESS,
    adminAddress: process.env.ADMIN_ADDRESS || "", // Add Admin address
  },
  treasury: {
    homelessness: process.env.TREASURY_HOMELESSNESS || "",
    palestine: process.env.TREASURY_PALESTINE || "",
    communist: process.env.TREASURY_COMMUNIST || "",
    sweaBank: process.env.TREASURY_SWEA_BANK || "", // Added for sWEA Bank Treasury
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
