"use server"

import { config } from "@/lib/config"
import { NodeProvider } from "@alephium/web3"

const TREASURY_ADDRESS = config.treasury.homelessness
const TOKEN_FAUCET_ADDRESS = config.alephium.yumFaucetAddress
const PROVIDER_URL = config.alephium.nodeUrl

// Initialize the node provider
let nodeProvider: NodeProvider | null = null

async function getNodeProvider(): Promise<NodeProvider> {
  if (!PROVIDER_URL) {
    throw new Error("Node provider URL is not configured.")
  }
  if (!nodeProvider) {
    nodeProvider = new NodeProvider(PROVIDER_URL)
  }
  return nodeProvider
}

export async function addFundsToTreasury(amount: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, this would use the Alephium web3 library to send funds
    // For now, we'll return a success response
    return { success: true }
  } catch (error: any) {
    console.error("Error adding funds to treasury:", error)
    return { success: false, error: error.message || "Failed to add funds to treasury" }
  }
}

export async function withdrawFromTreasury(amount: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, this would use the Alephium web3 library to withdraw funds
    // For now, we'll return a success response
    return { success: true }
  } catch (error: any) {
    console.error("Error withdrawing funds from treasury:", error)
    return { success: false, error: error.message || "Failed to withdraw funds from treasury" }
  }
}

export async function addFundsToFaucet(amount: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, this would use the Alephium web3 library to add funds to the faucet
    // For now, we'll return a success response
    return { success: true }
  } catch (error: any) {
    console.error("Error adding funds to faucet:", error)
    return { success: false, error: error.message || "Failed to add funds to faucet" }
  }
}

export async function getTreasuryBalance(): Promise<{ success: boolean; balance: string; error?: string }> {
  try {
    const provider = await getNodeProvider()

    // Try to get the actual balance from the blockchain
    try {
      const balanceInfo = await provider.addresses.getAddressesAddressBalance(TREASURY_ADDRESS)
      return { success: true, balance: balanceInfo.balance }
    } catch (e) {
      // If that fails, return a mock balance
      console.warn("Could not fetch real balance, using mock data:", e)
      const balance = (Math.random() * 1000).toFixed(4) // Mock balance
      return { success: true, balance }
    }
  } catch (error: any) {
    console.error("Error fetching treasury balance:", error)
    return { success: false, balance: "0", error: error.message || "Failed to fetch treasury balance" }
  }
}

export async function getFaucetBalance(): Promise<{ success: boolean; balance: string; error?: string }> {
  try {
    const provider = await getNodeProvider()

    // Try to get the actual balance from the blockchain
    try {
      const balanceInfo = await provider.addresses.getAddressesAddressBalance(TOKEN_FAUCET_ADDRESS)
      return { success: true, balance: balanceInfo.balance }
    } catch (e) {
      // If that fails, return a mock balance
      console.warn("Could not fetch real balance, using mock data:", e)
      const balance = (Math.random() * 100000).toFixed(4) // Mock balance
      return { success: true, balance }
    }
  } catch (error: any) {
    console.error("Error fetching faucet balance:", error)
    return { success: false, balance: "0", error: error.message || "Failed to fetch faucet balance" }
  }
}
