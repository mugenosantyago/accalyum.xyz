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
          // Dispatch the event to notify listeners about the connection
          triggerWalletConnectionEvent(true, address)
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
 * Trigger the wallet connection changed event
 */
export function triggerWalletConnectionEvent(connected: boolean, address: string | null): void {
  if (typeof window === "undefined") return
  
  console.log("Dispatching walletConnectionChanged event:", { connected, address })
  window.dispatchEvent(
    new CustomEvent("walletConnectionChanged", {
      detail: { connected, address },
    })
  )
}

/**
 * Format an address for display
 */
export function formatAddress(address: string | null): string {
  if (!address) return "Not connected"
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}
