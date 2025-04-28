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
      // Only use Alephium's native extension API
      if (typeof window !== "undefined" && window.alephium) {
        try {
          const connected = await window.alephium.isConnected()
          if (connected) {
            const addr = await window.alephium.getSelectedAccount()
            if (addr) {
              logger.info("useWalletDetector: Connection detected:", addr)
              setIsConnected(true)
              setAddress(addr)
              setIsLoading(false)
              return
            }
          }
          
          // If we get here with window.alephium but no connection, reset state
          setIsConnected(false)
          setAddress(null)
        } catch (err) {
          logger.warn("useWalletDetector: Error checking Alephium connection:", err)
          setIsConnected(false)
          setAddress(null)
        }
      } else {
        // No window.alephium available
        setIsConnected(false)
        setAddress(null)
      }
    } catch (error) {
      logger.error("useWalletDetector: Error in connection check:", error)
      setIsConnected(false)
      setAddress(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkConnection()

    // Listen for Alephium's accountsChanged event
    const handleAccountsChanged = () => {
      logger.info("useWalletDetector: Accounts changed, rechecking connection")
      checkConnection()
    }

    if (typeof window !== "undefined" && window.alephium && window.alephium.on) {
      try {
        window.alephium.on("accountsChanged", handleAccountsChanged)
      } catch (error) {
        logger.error("useWalletDetector: Error setting up Alephium event listener:", error)
      }
    }

    return () => {
      if (typeof window !== "undefined" && window.alephium && window.alephium.off) {
        try {
          window.alephium.off("accountsChanged", handleAccountsChanged)
        } catch (error) {
          logger.error("useWalletDetector: Error removing Alephium event listener:", error)
        }
      }
    }
  }, [checkConnection])

  return {
    isConnected,
    address,
    isLoading,
    checkConnection,
  }
}
