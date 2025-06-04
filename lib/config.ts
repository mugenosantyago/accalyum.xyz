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
    acyumDecimals: parseInt(process.env.NEXT_PUBLIC_ACYUM_DECIMALS || "4", 10),
    acyumFaucetAddress: process.env.NEXT_PUBLIC_ACYUM_FAUCET_ADDRESS || "vWvXtZRY7X5z1amCJ9U1rTzJ9SvbX6TUnchxhLgsbV3G", // Updated Faucet Address fallback
    
    // sWEA Configuration
    sweaTokenIdHex: process.env.NEXT_PUBLIC_SWEA_TOKEN_ID_HEX ?? "5d738e4fda3dab2c3edf175842df94f877f4be41b06bba553f61328b5c276300", // Updated with provided ID
    sweaDecimals: parseInt(process.env.NEXT_PUBLIC_SWEA_DECIMALS || "9", 10), // Updated to 9 decimals
    sweaFaucetAddress: process.env.NEXT_PUBLIC_SWEA_FAUCET_ADDRESS || "1DjCZbKGATt82mxygUDuNr8yYxf786SNc7ek9ZEeY3CYC", // Added sWEA Faucet Address

    // Deposit Contract
    depositContractAddress: process.env.NEXT_PUBLIC_DEPOSIT_CONTRACT_ADDRESS || "", // Added Deposit Contract Address

    // Backend Wallet for Faucet Operations
    backendWalletPrivateKey: process.env.BACKEND_WALLET_PRIVATE_KEY || "", // !! KEEP SECRET !!

    // Add contract addresses here when known
    // sweaClaimContractAddress: process.env.NEXT_PUBLIC_SWEA_CLAIM_CONTRACT_ADDRESS,
    // sweaPurchaseContractAddress: process.env.NEXT_PUBLIC_SWEA_PURCHASE_CONTRACT_ADDRESS,
    adminAddress: process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "16Wr9KvdT31S99Yw3GCnsXciS9uB2vuxpnD75qQvAFmay", // Use ENV var or fallback to hardcoded address
  },
  treasury: {
    homelessness: process.env.NEXT_PUBLIC_TREASURY_HOMELESSNESS || "",
    palestine: process.env.NEXT_PUBLIC_TREASURY_PALESTINE || "",
    communist: process.env.NEXT_PUBLIC_TREASURY_COMMUNIST || "",
    sweaBank: process.env.NEXT_PUBLIC_TREASURY_SWEA_BANK || "1DjCZbKGATt82mxygUDuNr8yYxf786SNc7ek9ZEeY3CYC",
  },
  database: {
    mongoUri: process.env.MONGODB_URI || "",
    mongoDb: "acyum", // Hardcoded database name
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
  name: "YUM Network",
  description:
    "A community-driven socialist token built on the Alephium blockchain, designed to empower social causes and mutual aid.",
  url: "https://accalyum.xyz",
  ogImage: "https://accalyum.xyz/images/og-image.jpg",
  links: {
    twitter: "https://twitter.com/acyum_network",
    github: "https://github.com/acyum",
  },
}
