import { Address, ContractId } from "@alephium/web3"

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

// Format YUM balance for display - Changed from ACYUM
export function formatYumBalance(balance: string): string { // Changed from formatAcyumBalance
  if (!balance) return "0.00"

  try {
    // YUM has 4 decimal places - Changed from 7
    const balanceNum = Number.parseFloat(balance) / 10 ** 4 // Changed from 7
    return balanceNum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  } catch (error) {
    console.error("Error formatting YUM balance:", error) // Changed from ACYUM
    return "0.00"
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
      // Check if it's a valid base58 address
      if (Address.isBase58(address)) {
        const addressObj = Address.fromBase58(address)
        return {
          isValid: true,
          isContract: addressObj.isContractAddress(),
          isAsset: !addressObj.isContractAddress(),
        }
      }

      // Check if it's a valid hex contract ID
      if (ContractId.isHexString(address)) {
        return {
          isValid: true,
          isContract: true,
          isAsset: false,
        }
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
      if (Address.isBase58(address)) {
        return Address.getGroup(address)
      }

      if (ContractId.isHexString(address)) {
        const contractId = ContractId.fromHexString(address)
        const contractAddress = Address.contract(contractId)
        return Address.getGroup(contractAddress.toBase58())
      }

      return -1
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
      if (!ContractId.isHexString(contractId)) {
        throw new Error("Invalid contract ID format")
      }
      const contractIdObj = ContractId.fromHexString(contractId)
      return Address.contract(contractIdObj).toBase58()
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
      if (!Address.isBase58(address)) {
        throw new Error("Invalid address format")
      }
      const addressObj = Address.fromBase58(address)
      if (!addressObj.isContractAddress()) {
        throw new Error("Address is not a contract address")
      }
      return addressObj.contractId.toHexString()
    } catch (error) {
      console.error("Error converting address to contract ID:", error)
      throw error
    }
  },
}
