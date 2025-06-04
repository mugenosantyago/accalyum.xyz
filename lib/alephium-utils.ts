import { NodeProvider } from "@alephium/web3"
import { isAssetAddress, isContractAddress, groupOfAddress, addressFromContractId, contractIdFromAddress } from "@alephium/web3/dist/src/address/address"
import { config } from "@/lib/config"
import { Buffer } from 'buffer'

// Add the token faucet configuration
export const tokenFaucetConfig = {
  network: process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || "mainnet",
  groupIndex: undefined, // Let the wallet determine the group
  nodeUrl: process.env.NEXT_PUBLIC_ALEPHIUM_PROVIDER_URL || "https://node.alephium.org",
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_API_URL || "https://explorer.alephium.org",
}

// Format ALPH balance for display
export function formatAlphBalance(balance: string): string {
  if (!balance) return "0.00"

  try {
    // Convert to number and format with 4 decimal places
    const balanceNum = Number.parseFloat(balance) / 10 ** 18
    return balanceNum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  } catch (error) {
    console.error("Error formatting ALPH balance:", error)
    return "0.00"
  }
}

// Format YUM balance for display
export function formatYumBalance(balance: string): string {
  try {
    const num = parseFloat(balance)
    if (isNaN(num)) {
      return "N/A"
    }
    return num.toFixed(2)
  } catch (error) {
    console.error("Error formatting YUM balance:", error)
    return "Error"
  }
}

export const AlephiumUtils = {
  validateAddress: (address: string) => {
    if (!address) {
      return {
        isValid: false,
        isContract: false,
        isAsset: false,
      }
    }

    try {
      // Check if it's a valid base58 address or contract address
      if (isAssetAddress(address) || isContractAddress(address)) {
        return {
          isValid: true,
          isContract: isContractAddress(address),
          isAsset: isAssetAddress(address),
        }
      }

      // Check if it's a valid hex contract ID (can be converted to address)
      try {
        const convertedAddress = addressFromContractId(address)
        if (isContractAddress(convertedAddress)) {
          return {
            isValid: true,
            isContract: true,
            isAsset: false,
          }
        }
      } catch (error) {
        // If conversion fails, it's not a valid contract ID hex
      }

      return {
        isValid: false,
        isContract: false,
        isAsset: false,
      }
    } catch (error) {
      console.error("Error validating address:", error)
      return {
        isValid: false,
        isContract: false,
        isAsset: false,
      }
    }
  },

  getAddressGroup: (address: string): number => {
    if (!address) return -1

    try {
      return groupOfAddress(address)
    } catch (error) {
      console.error("Error getting address group:", error)
      return -1
    }
  },

  contractIdToAddress: (contractId: string): string => {
    if (!contractId) {
      throw new Error("Contract ID is required")
    }

    try {
      return addressFromContractId(contractId)
    } catch (error) {
      console.error("Error converting contract ID to address:", error)
      throw error
    }
  },

  addressToContractId: (address: string): string => {
    if (!address) {
      throw new Error("Address is required")
    }

    try {
      const contractId = contractIdFromAddress(address)
      // contractIdFromAddress returns Uint8Array if valid, so we check its existence.
      // It also throws an error if it's not a contract address, so we don't need isContractAddress() check here.
      if (!contractId || contractId.length === 0) {
        throw new Error("Address is not a contract address or invalid.")
      }
      return Buffer.from(contractId).toString('hex')
    } catch (error) {
      console.error("Error converting address to contract ID:", error)
      throw error
    }
  },
}

export async function getYumTokenId(): Promise<string> {
  // In a real scenario, this would likely be fetched from a deployed contract or a config file.
  // For this example, we'll use the hardcoded token ID from your config.ts
  return config.alephium.yumTokenIdHex;
}
