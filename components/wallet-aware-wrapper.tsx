"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useWalletDetector } from "@/hooks/use-wallet-detector"

interface WalletAwareWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  requireWallet?: boolean
}

export function WalletAwareWrapper({ children, fallback = null, requireWallet = false }: WalletAwareWrapperProps) {
  const { isConnected, address, isLoading, checkConnection } = useWalletDetector()
  const [forceUpdate, setForceUpdate] = useState(0)

  // Check for wallet connection when component mounts
  useEffect(() => {
    console.log("WalletAwareWrapper: Checking wallet connection...")
    checkConnection()

    // Also check directly with window.alephium
    const checkDirectConnection = async () => {
      if (typeof window !== "undefined" && window.alephium) {
        try {
          const isDirectlyConnected = await window.alephium.isConnected()
          if (isDirectlyConnected) {
            // Force a re-render
            setForceUpdate((prev) => prev + 1)
          }
        } catch (err) {
          console.warn("Error checking direct connection:", err)
        }
      }
    }

    checkDirectConnection()

    // Listen for custom wallet connection events
    const handleWalletConnectionChanged = () => {
      console.log("WalletAwareWrapper: Wallet connection changed, rechecking...")
      checkConnection()
      setForceUpdate((prev) => prev + 1)
    }

    window.addEventListener("walletConnectionChanged", handleWalletConnectionChanged)

    // Also poll for connection changes
    const intervalId = setInterval(() => {
      checkConnection()
    }, 3000)

    return () => {
      window.removeEventListener("walletConnectionChanged", handleWalletConnectionChanged)
      clearInterval(intervalId)
    }
  }, [checkConnection])

  // If we explicitly require a wallet connection
  if (requireWallet && !isConnected) {
    // Check directly with window.alephium as a last resort
    if (typeof window !== "undefined" && window.alephium) {
      const checkDirectConnectionSync = () => {
        window.alephium
          .isConnected()
          .then((isDirectlyConnected) => {
            if (isDirectlyConnected) {
              window.alephium
                .getSelectedAccount()
                .then((addr) => {
                  if (addr) {
                    // Force a re-render
                    setForceUpdate((prev) => prev + 1)
                  }
                })
                .catch(console.error)
            }
          })
          .catch(console.error)
      }

      checkDirectConnectionSync()
    }

    // If we're still checking, show a simple indicator
    if (isLoading) {
      return (
        <div className="p-4 text-center">
          <p className="text-gray-400">Checking wallet connection...</p>
        </div>
      )
    }

    // Return the fallback if provided, otherwise null
    return fallback
  }

  // Enhance child components with wallet information via props
  const enhancedChildren = () => {
    // If children is a function, call it with wallet data
    if (typeof children === "function") {
      return children({ isConnected, address, isLoading, forceUpdate })
    }

    // Otherwise just render the children
    return children
  }

  return <>{enhancedChildren()}</>
}
