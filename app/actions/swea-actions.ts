'use server'

import { SignerProvider } from "@alephium/web3-react";
import { NodeProvider, web3 } from "@alephium/web3";
import { TokenBalance } from "@alephium/types/dist/api/api-alephium";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { formatBigIntAmount } from "@/lib/utils"; // Assuming formatBigIntAmount exists here

// Function to get NodeProvider (replace with your actual provider setup if different)
async function getNodeProvider(): Promise<NodeProvider> {
  // Example: Directly using configured provider URL
  if (!config.alephium.providerUrl) {
    throw new Error("Node provider URL is not configured.");
  }
  // Note: In a real app, you might manage a shared provider instance
  return new NodeProvider(config.alephium.providerUrl);
}

/**
 * Server Action to fetch the sWEA balance of a given address.
 */
export async function getSweaBalanceAction(address: string): Promise<{ success: boolean; balance: string; error?: string }> {
  logger.info(`Server Action: Fetching sWEA balance for ${address}`);
  if (!config.alephium.sweaTokenIdHex) {
    return { success: false, balance: "0", error: "sWEA Token ID not configured." };
  }

  try {
    const provider = await getNodeProvider();
    const balanceResponse = await provider.addresses.getAddressesAddressBalance(address);
    
    const sweaBalanceInfo = balanceResponse.tokenBalances?.find((token: TokenBalance) => token.id === config.alephium.sweaTokenIdHex);
    const sweaBalanceBigInt = sweaBalanceInfo ? BigInt(sweaBalanceInfo.amount) : 0n;

    const formattedBalance = formatBigIntAmount(sweaBalanceBigInt, config.alephium.sweaDecimals, 2); // Display 2 decimal places

    logger.info(`Server Action: sWEA balance for ${address} is ${formattedBalance}`);
    return { success: true, balance: formattedBalance };

  } catch (error) {
    logger.error(`Server Action Error fetching sWEA balance for ${address}:`, error);
    return { success: false, balance: "Error", error: error instanceof Error ? error.message : "Failed to fetch balance" };
  }
}

/**
 * Server Action for Admin to deposit sWEA into the sWEA Bank Treasury.
 * Requires the admin's SignerProvider.
 */
export async function addSweaToTreasuryAction(
  // Note: Server actions cannot directly receive non-serializable objects like SignerProvider.
  // This action would typically be called from a component that *has* the signer 
  // and the component itself would execute the transaction.
  // Or, implement a more complex API route pattern requiring auth + admin check.
  // For simplicity here, we simulate based on amount and address, 
  // assuming the calling context handles the transaction signing.
  adminAddress: string, // The admin initiating the deposit
  amount: string, 
  treasuryAddress: string
): Promise<{ success: boolean; txId?: string; error?: string }> {
  logger.info(`Server Action: Simulating sWEA deposit of ${amount} from admin ${adminAddress} to treasury ${treasuryAddress}`);
  
  if (!config.alephium.sweaTokenIdHex) {
    return { success: false, error: "sWEA Token ID not configured." };
  }
  if (!treasuryAddress) {
     return { success: false, error: "Treasury address not provided." };
  }

  try {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { success: false, error: "Invalid deposit amount." };
    }
    const amountSmallestUnit = BigInt(Math.floor(amountNum * (10 ** config.alephium.sweaDecimals)));
    
    // --- !!! --- 
    // SECURITY NOTE: This is a PLACEHOLDER.
    // A real implementation needs the admin to SIGN the transaction on the client-side.
    // The server action should ideally just validate/log, or be part of a secure API.
    // DO NOT perform transactions based solely on server action calls without proper auth/signing.
    logger.warn(`Server Action: Placeholder for sWEA deposit. Actual transaction must be signed by admin ${adminAddress} on the client.`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
    const simulatedTxId = `simulated_tx_${Date.now()}`;
    // --- !!! --- 
    
    logger.info(`Server Action: Simulated sWEA deposit successful. Tx ID: ${simulatedTxId}`);
    return { success: true, txId: simulatedTxId };

  } catch (error) {
    logger.error(`Server Action Error simulating sWEA deposit:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to simulate deposit" };
  }
} 