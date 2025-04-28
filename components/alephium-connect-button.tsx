"use client"

import { Button } from "@/components/ui/button"
import { Loader2, Wallet } from "lucide-react"
import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useWalletDetector } from "@/hooks/use-wallet-detector"
import { logger } from "@/lib/logger"
import dynamic from "next/dynamic"

// Dynamically import the official AlephiumConnectButton with no SSR
const DynamicAlephiumConnectButton = dynamic(
  async () => {
    try {
      const { AlephiumConnectButton } = await import("@alephium/web3-react")
      return AlephiumConnectButton
    } catch (error) {
      logger.error("Failed to load AlephiumConnectButton:", error)
      return () => <FallbackButton />
    }
  },
  { ssr: false },
)

// Fallback button when dynamic import fails
function FallbackButton() {
  const { connect } = useWallet()
  const { isConnected, address, checkConnection } = useWalletDetector()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      await connect()
      await checkConnection()
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    } finally {
      setIsLoading(false)
    }
  }

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

  return (
    <Button
      className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white hover:bg-[#E85A2A]"
      onClick={handleConnect}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          <span>Connect Wallet</span>
        </>
      )}
    </Button>
  )
}

// Create a simplified version that won't crash browsers
export function AlephiumConnectButton() {
  const [mounted, setMounted] = useState(false)
  const { isConnected, address, checkConnection } = useWalletDetector()

  useEffect(() => {
    setMounted(true)
    checkConnection()
  }, [checkConnection])

  // During SSR or if not mounted yet, return a simple button
  if (!mounted) {
    return (
      <Button className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white hover:bg-[#E85A2A]">
        <Wallet className="mr-2 h-4 w-4" />
        <span>Connect Wallet</span>
      </Button>
    )
  }

  // If we're connected according to our detector, show a different button
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

  // Try to use the official component
  return <DynamicAlephiumConnectButton />
}
