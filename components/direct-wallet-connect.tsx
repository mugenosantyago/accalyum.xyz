"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { logger } from "@/lib/logger"

export function DirectWalletConnect() {
  const { isConnected, connect, address } = useWallet()
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false)
  const [directAddress, setDirectAddress] = useState<string | null>(null)

  // Check for direct connection on mount and periodically
  useEffect(() => {
    const checkDirectConnection = async () => {
      if (typeof window !== "undefined" && window.alephium) {
        try {
          const isDirectlyConnected = await window.alephium.isConnected()
          if (isDirectlyConnected) {
            const addr = await window.alephium.getSelectedAccount()
            if (addr) {
              logger.info("DirectWalletConnect: Direct connection detected:", addr)
              setDirectAddress(addr)

              // Dispatch event to notify other components
              window.dispatchEvent(
                new CustomEvent("walletConnectionChanged", {
                  detail: { connected: true, address: addr },
                }),
              )
            }
          } else {
            setDirectAddress(null)
          }
        } catch (err) {
          logger.warn("DirectWalletConnect: Error checking direct connection:", err)
        }
      }
    }

    checkDirectConnection()

    // Poll for connection changes
    const intervalId = setInterval(checkDirectConnection, 3000)

    return () => clearInterval(intervalId)
  }, [])

  const handleConnect = async () => {
    setIsAttemptingConnection(true)
    try {
      await connect()
    } catch (error) {
      logger.error("DirectWalletConnect: Failed to connect wallet:", error)

      // Try direct connection as fallback
      if (typeof window !== "undefined" && window.alephium) {
        try {
          await window.alephium.enable()
          const addr = await window.alephium.getSelectedAccount()
          if (addr) {
            setDirectAddress(addr)

            // Dispatch event to notify other components
            window.dispatchEvent(
              new CustomEvent("walletConnectionChanged", {
                detail: { connected: true, address: addr },
              }),
            )
          }
        } catch (err) {
          logger.error("DirectWalletConnect: Failed direct connection:", err)
        }
      }
    } finally {
      setIsAttemptingConnection(false)
    }
  }

  // If we have a direct address but not connected in our state
  if (directAddress && !isConnected) {
    return (
      <div className="text-center">
        <p className="text-green-500 mb-2">
          Address detected: {directAddress.substring(0, 6)}...{directAddress.substring(directAddress.length - 4)}
        </p>
        <p className="text-gray-400 mb-4">But connection state is not recognized. Please try reconnecting.</p>
        <Button className="bg-[#FF6B35] hover:bg-[#E85A2A]" onClick={handleConnect} disabled={isAttemptingConnection}>
          {isAttemptingConnection ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Reconnect Wallet
            </>
          )}
        </Button>
      </div>
    )
  }

  // If we're connected according to our hook
  if (isConnected && address) {
    return (
      <Button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">
        <Wallet className="mr-2 h-4 w-4" />
        <span>
          {address.substring(0, 6)}...{address.substring(address.length - 4)}
        </span>
      </Button>
    )
  }

  // Default connect button
  return (
    <Button className="bg-[#FF6B35] hover:bg-[#E85A2A]" onClick={handleConnect} disabled={isAttemptingConnection}>
      {isAttemptingConnection ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  )
}
