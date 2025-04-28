/**
 * Direct wallet connection utilities that bypass the normal hooks
 */

export async function checkDirectWalletConnection(): Promise<{ connected: boolean; address: string | null }> {
  console.log("Directly checking wallet connection status...")

  // Default result
  const result = { connected: false, address: null }

  // Skip if not in browser
  if (typeof window === "undefined") {
    console.log("Not in browser environment, skipping check")
    return result
  }

  // Check window.alephium directly
  if (window.alephium) {
    try {
      console.log("window.alephium found, checking connection...")
      const isConnected = await window.alephium.isConnected()
      console.log("window.alephium.isConnected() returned:", isConnected)

      if (isConnected) {
        const address = await window.alephium.getSelectedAccount()
        console.log("window.alephium.getSelectedAccount() returned:", address)

        if (address) {
          console.log("Direct connection confirmed with address:", address)
          return { connected: true, address }
        }
      }
    } catch (err) {
      console.warn("Error checking direct wallet connection:", err)
    }
  } else {
    console.log("window.alephium not found")
  }

  return result
}

/**
 * Format an address for display
 */
export function formatAddress(address: string | null): string {
  if (!address) return "Not connected"
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}
