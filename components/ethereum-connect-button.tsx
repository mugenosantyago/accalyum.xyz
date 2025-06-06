"use client"

import { Button } from "@/components/ui/button"
import { Wallet, Loader2, AlertCircle } from "lucide-react"
import { useEthereum } from "@/components/ethereum-provider"
import { useToast } from "@/components/ui/use-toast"
import { config } from "@/lib/config"

export function EthereumConnectButton() {
  const { isConnected, isConnecting, account, chainId, connect, disconnect, switchToMainnet } = useEthereum()
  const { toast } = useToast()

  const handleConnect = async () => {
    try {
      await connect()
      toast({
        title: "Connected",
        description: "Successfully connected to Ethereum wallet",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Ethereum wallet",
        variant: "destructive",
      })
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchToMainnet()
      toast({
        title: "Network Switched",
        description: "Switched to Ethereum mainnet",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Network Switch Failed",
        description: "Failed to switch to Ethereum mainnet",
        variant: "destructive",
      })
    }
  }

  if (isConnected && account) {
    const isWrongNetwork = chainId !== config.ethereum.chainId
    
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium">Ethereum Wallet Connected</p>
          <p className="font-mono text-xs break-all">{account}</p>
          {isWrongNetwork && (
            <div className="flex items-center gap-1 text-amber-600 mt-1">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">Wrong network detected</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isWrongNetwork && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSwitchNetwork}
              className="text-xs"
            >
              Switch to Mainnet
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={disconnect}
            className="text-xs"
          >
            Disconnect
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="w-full"
      variant="outline"
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Ethereum Wallet
        </>
      )}
    </Button>
  )
} 