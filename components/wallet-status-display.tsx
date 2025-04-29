"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff } from "lucide-react"
import { useWallet } from "@alephium/web3-react"

export function WalletStatusDisplay() {
  const { connectionStatus } = useWallet();
  const isConnected = connectionStatus === 'connected';
  
  return (
    <div className="flex items-center justify-end space-x-2 text-sm text-gray-500">
      {isConnected ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <span>{isConnected ? "Connected" : "Disconnected"}</span>
    </div>
  )
}
