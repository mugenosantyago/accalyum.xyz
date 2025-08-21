// Environment variables configuration
export const config = {
  siteName: "YUM",
  siteDescription: "YUM: Youth Uprising Movement - Empowering indigenous communities.",
  siteUrl: "https://accalyum.xyz",
  twitterUrl: "https://x.com/alephionline",
  roadmapUrl: "https://roadmap.alephi.online",
  wallet: {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },
  alephium: {
    network: (process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || "testnet") as "mainnet" | "testnet" | "devnet",
    nodeUrl: process.env.NEXT_PUBLIC_NODE_URL,
    yumTokenIdHex: process.env.NEXT_PUBLIC_YUM_TOKEN_ID_HEX ?? "",
    yumDecimals: parseInt(process.env.NEXT_PUBLIC_YUM_DECIMALS || "4", 10),
    yumFaucetAddress: "1C8jLgCh8tV8HKnvcCo3hTVK1obVCS99cbWXE6c1QHVd8",
    sweaTokenIdHex: process.env.NEXT_PUBLIC_SWEA_TOKEN_ID_HEX ?? "5d738e4fda3dab2c3edf175842df94f877f4be41b06bba553f61328b5c276300",
    sweaDecimals: parseInt(process.env.NEXT_PUBLIC_SWEA_DECIMALS || "9", 10),
    sweaFaucetAddress: "1C8jLgCh8tV8HKnvcCo3hTVK1obVCS99cbWXE6c1QHVd8",
    depositContractAddress: process.env.NEXT_PUBLIC_DEPOSIT_CONTRACT_ADDRESS || "",
    backendWalletPrivateKey: process.env.BACKEND_WALLET_PRIVATE_KEY || "",
    adminAddress: process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "16Wr9KvdT31S99Yw3GCnsXciS9uB2vuxpnD75qQvAFmay",
  },
  ethereum: {
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    chainId: parseInt(process.env.NEXT_PUBLIC_ETHEREUM_CHAIN_ID || "1", 10), // 1 for mainnet
    usdtContractAddress: process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT mainnet
    usdtDecimals: 6, // USDT has 6 decimals
    treasuryEthereumAddress: process.env.NEXT_PUBLIC_TREASURY_ETHEREUM_ADDRESS || "0xB43301E1Fe9Ce0681C644234c7750846076839cD", // YUM treasury Ethereum address
  },
  treasury: {
    homelessness: "1C8jLgCh8tV8HKnvcCo3hTVK1obVCS99cbWXE6c1QHVd8",
    palestine: "1C8jLgCh8tV8HKnvcCo3hTVK1obVCS99cbWXE6c1QHVd8",
    communist: "1C8jLgCh8tV8HKnvcCo3hTVK1obVCS99cbWXE6c1QHVd8",
    sweaBank: "1C8jLgCh8tV8HKnvcCo3hTVK1obVCS99cbWXE6c1QHVd8",
  },
  mongo: {
    uri: process.env.MONGODB_URI ?? "mongodb+srv://acyum:SQ87wyXxmxBPKeuB@users.ie7ie.mongodb.net/?retryWrites=true&w=majority&appName=Users",
    dbName: process.env.MONGODB_DB_NAME ?? "acyum",
  },
  storage: {
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || "",
  },
  links: {
    twitter: "https://x.com/alephionline",
    roadmap: "https://roadmap.alephi.online",
  },
  defaultOpenGraph: {
    // ... existing code ...
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
    twitter: "https://x.com/alephionline",
    roadmap: "https://roadmap.alephi.online",
  },
  defaultOpenGraph: {
    // ... existing code ...
  },
}
