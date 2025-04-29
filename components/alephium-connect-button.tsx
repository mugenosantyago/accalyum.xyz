"use client"

import { Button } from "@/components/ui/button"
import { Loader2, Wallet, LogOut } from "lucide-react"
import { logger } from "@/lib/logger"

// Import AlephiumConnectButton from web3-react
import { AlephiumConnectButton } from "@alephium/web3-react"
// Removed Account import as it wasn't found
// import { Account } from "@alephium/web3"

// Helper to format address
const formatAddress = (address: string | undefined): string => {
  if (!address) return "Not Connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Renamed component to avoid conflict
export function WalletConnectDisplay() { 
  return (
    <AlephiumConnectButton.Custom>
      {({ 
        isConnected, 
        isConnecting, 
        disconnect, 
        show, 
        hide, 
        account, // Use 'any' type as indicated by previous linter message
        truncatedAddress 
      }: { 
        isConnected: boolean; 
        isConnecting: boolean; 
        disconnect: () => Promise<void>; 
        show?: (() => void) | undefined; 
        hide?: (() => void) | undefined; 
        account?: any; // Use any type for account
        truncatedAddress?: string | undefined;
      }) => {
        // Accessing .address should be safe even with 'any'
        const address = account?.address; 

        if (isConnected) {
          return (
            <Button
              onClick={disconnect} 
              className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
              variant="secondary"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{formatAddress(address) ?? "Disconnect"}</span> 
            </Button>
          );
        } else {
          return (
            <Button
              onClick={show} 
              className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white hover:bg-[#E85A2A]"
              disabled={isConnecting} 
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              ) : (
                <Wallet className="mr-2 h-4 w-4" />
              )}
              <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
            </Button>
          );
        }
      }}
    </AlephiumConnectButton.Custom>
  );
}
