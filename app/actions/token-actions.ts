"use server"

import { config } from "@/lib/config"
import { NodeProvider } from "@alephium/web3"

const PROVIDER_URL: string | undefined = config.alephium.providerUrl

// Initialize the node provider
let nodeProvider: NodeProvider | null = null

async function getNodeProvider(): Promise<NodeProvider> {
  if (!nodeProvider) {
    if (!PROVIDER_URL) {
      throw new Error("Alephium node provider URL is not configured.");
    }
    nodeProvider = new NodeProvider(PROVIDER_URL)
  }
  return nodeProvider
}

// Helper to format token amounts based on decimals
function formatTokenAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) {
    return amount.toString();
  }
  const amountStr = amount.toString().padStart(decimals + 1, '0');
  const integerPart = amountStr.slice(0, -decimals);
  const fractionalPart = amountStr.slice(-decimals).replace(/0+$/, ''); // Remove trailing zeros
  return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
}

export async function getTokenBalanceAction(address: string, tokenId: string): Promise<{ success: boolean; balance: string; error?: string }> {
  if (!address) {
    return { success: false, balance: "0", error: "Address is required" };
  }
  if (!tokenId) {
     // Handle ALPH balance (tokenId is null/undefined for ALPH)
     return getAlphBalanceAction(address);
  }

  try {
    const provider = await getNodeProvider();
    
    // Find the token in the address's balance
    // Explicitly cast for now based on likely API response structure
    const balanceInfo = await provider.addresses.getAddressesAddressBalance(address) as { balance: string, tokenBalances?: Array<{ id: string, amount: string }> };
    const token = balanceInfo.tokenBalances?.find(tb => tb.id === tokenId);

    if (token) {
       // Get decimals from config.alephium based on known token IDs
       let decimals = 18; // Default to ALPH decimals
       if (tokenId === config.alephium.acyumTokenIdHex) {
         decimals = config.alephium.acyumDecimals ?? 7; // Default YUM decimals
       } else if (tokenId === config.alephium.sweaTokenIdHex) {
         decimals = config.alephium.sweaDecimals ?? 9; // Default sWEA decimals
       } else {
         // If token ID is not a known one from config, we might need to fetch token info
         console.warn(`Unknown token ID ${tokenId}. Using default decimals.`);
         // In a real app, you might fetch token info here to get decimals.
         // For now, we'll stick to known tokens or a default.
       }

       const formattedBalance = formatTokenAmount(BigInt(token.amount), decimals);
       return { success: true, balance: formattedBalance };
    } else {
       return { success: true, balance: "0" }; // Token not found at address
    }
  } catch (error: any) {
    console.error(`Error fetching token ${tokenId} balance for ${address}:`, error);
    return { success: false, balance: "0", error: error.message || "Failed to fetch token balance" };
  }
}

// Helper function specifically for fetching ALPH balance (tokenId is null)
async function getAlphBalanceAction(address: string): Promise<{ success: boolean; balance: string; error?: string }> {
   if (!address) {
    return { success: false, balance: "0", error: "Address is required" };
  }
  try {
    const provider = await getNodeProvider();
    const balanceInfo = await provider.addresses.getAddressesAddressBalance(address);
    // ALPH balance is in attoAlph, format it
    const formattedBalance = formatTokenAmount(BigInt(balanceInfo.balance), 18); // ALPH has 18 decimals
    return { success: true, balance: formattedBalance };
  } catch (error: any) {
    console.error(`Error fetching ALPH balance for ${address}:`, error);
    return { success: false, balance: "0", error: error.message || "Failed to fetch ALPH balance" };
  }
}

export async function getAcyumTokenId(): Promise<string> {
  return config.alephium.acyumTokenIdHex || ""
}

export async function getAcyumToken(): Promise<string> {
  return process.env.YUM_TOKEN || ""
}

// Keep existing treasury/faucet actions for now, but they might become redundant
// export async function getTreasuryBalance(): Promise<{ success: boolean; balance: string; error?: string }> { ... }
// export async function getFaucetBalance(): Promise<{ success: boolean; balance: string; error?: string }> { ... }
// export async function addFundsToTreasury(amount: string): Promise<{ success: boolean; error?: string }> { ... }
// export async function withdrawFromTreasury(amount: string): Promise<{ success: boolean; txId?: string; error?: string }> { ... }
// export async function addFundsToFaucet(amount: string): Promise<{ success: boolean; txId?: string; error?: string }> { ... }

// Potentially rename/reuse swea-actions
// export async function getSweaBalanceAction(treasuryAddress: string): Promise<{ success: boolean; balance: string; error?: string }> { ... }
// export async function addSweaToTreasuryAction(adminAddress: string, amount: string, treasuryAddress: string): Promise<{ success: boolean; txId?: string; error?: string }> { ... }
