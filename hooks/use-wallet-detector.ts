"use client"

import { useState, useEffect, useCallback } from "react"
import { logger } from "@/lib/logger"

export function useWalletDetector() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkConnection = useCallback(async () => {
    setIsLoading(true)
    try {
      // First check direct window.alephium access
      if (typeof window !== "undefined" && window.alephium) {
        try {
          const connected = await window.alephium.isConnected()
          if (connected) {
            const addr = await window.alephium.getSelectedAccount()
            if (addr) {
              logger.info("useWalletDetector: Direct connection detected:", addr)
              setIsConnected(true)
              setAddress(addr)
              setIsLoading(false)
              return
            }
          }
        } catch (err) {
          logger.warn("useWalletDetector: Error checking direct connection:", err)
        }
      }

      // Then check our custom WalletConnector
      try {
        const { WalletConnector } = await import("@/lib/alephium")
        const walletInfo = await WalletConnector.getConnectedWallet()
        if (walletInfo && walletInfo.address) {
          logger.info("useWalletDetector: WalletConnector connection detected:", walletInfo.address)
          setIsConnected(true)
          setAddress(walletInfo.address)
          setIsLoading(false)
          return
        }
      } catch (err) {
        logger.warn("useWalletDetector: Error checking WalletConnector:", err)
      }

      // If we get here, no connection was found
      setIsConnected(false)
      setAddress(null)
    } catch (error) {
      logger.error("useWalletDetector: Error checking wallet connection:", error)
      setIsConnected(false)
      setAddress(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()

    // Set up polling to check connection status
    const intervalId = setInterval(checkConnection, 3000)

    // Listen for custom wallet connection events
    const handleWalletConnectionChanged = (event: any) => {
      const { connected, address: newAddress } = event.detail || {}
      logger.info("useWalletDetector: Wallet connection changed event:", { connected, newAddress })
      setIsConnected(!!connected)
      setAddress(newAddress || null)
    }

    window.addEventListener("walletConnectionChanged", handleWalletConnectionChanged)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("walletConnectionChanged", handleWalletConnectionChanged)
    }
  }, [checkConnection])

  return {
    isConnected,
    address,
    isLoading,
    checkConnection,
  }
}
