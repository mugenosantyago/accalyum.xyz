"use client"

import { useWalletDetector } from "@/hooks/use-wallet-detector"
import { useEffect } from "react"

export function WalletStatusDisplay() {
  const { isConnected, address, isLoading, checkConnection } = useWalletDetector()

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  if (isLoading) {
    return <div className="text-sm text-gray-500">Checking wallet connection...</div>
  }

  if (!isConnected) {
    return <div className="text-sm text-amber-600">No wallet connected</div>
  }

  return (
    <div className="text-sm">
      <span className="text-green-600 font-medium">Connected: </span>
      <span className="font-mono">
        {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
      </span>
    </div>
  )
}
