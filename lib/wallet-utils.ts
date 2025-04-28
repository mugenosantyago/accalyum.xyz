/**
 * Utility functions for working with the Alephium wallet
 */

/**
 * Format an address for display
 */
export function formatAddress(address: string | null): string {
  if (!address) return "Not connected"
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

/**
 * Check if the Alephium wallet extension is connected
 */
export async function checkAlephiumConnection(): Promise<{ connected: boolean; address: string | null }> {
  // Default result
  const result = { connected: false, address: null }

  // Skip if not in browser
  if (typeof window === "undefined" || !window.alephium) {
    return result
  }

  try {
    const isConnected = await window.alephium.isConnected()
    if (isConnected) {
      const address = await window.alephium.getSelectedAccount()
      if (address) {
        return { connected: true, address }
      }
    }
  } catch (err) {
    console.warn("Error checking Alephium wallet connection:", err)
  }

  return result
}
