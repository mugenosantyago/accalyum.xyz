"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { formatAddress, checkAlephiumConnection } from "@/lib/wallet-utils"

interface ConnectionSuccessModalProps {
  featureName: string
}

export function ConnectionSuccessModal({ featureName }: ConnectionSuccessModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [hasShownModal, setHasShownModal] = useState(false)

  useEffect(() => {
    let checkTimeout: NodeJS.Timeout

    // Check for wallet connection using Alephium's native methods
    const checkConnection = async () => {
      try {
        // Use our simplified function to check for connection
        const { connected, address } = await checkAlephiumConnection()
        
        if (connected && address && !hasShownModal) {
          console.log(`ConnectionSuccessModal: Connection detected for ${featureName}`, address)
          setConnectedAddress(address)
          setIsOpen(true)
          setHasShownModal(true)
          return
        }
        
        // If not connected yet, try again soon
        if (!hasShownModal) {
          checkTimeout = setTimeout(checkConnection, 1000)
        }
      } catch (error) {
        console.error("Error checking connection:", error)
        
        // If there was an error, try again soon
        if (!hasShownModal) {
          checkTimeout = setTimeout(checkConnection, 1000)
        }
      }
    }

    // Start checking
    checkConnection()

    // Listen for Alephium's accountsChanged event
    const handleAccountsChanged = () => {
      console.log("Accounts changed event detected")
      checkConnection()
    }

    if (typeof window !== "undefined" && window.alephium && window.alephium.on) {
      try {
        window.alephium.on("accountsChanged", handleAccountsChanged)
      } catch (error) {
        console.error("Error setting up Alephium event listener:", error)
      }
    }

    return () => {
      clearTimeout(checkTimeout)
      if (typeof window !== "undefined" && window.alephium && window.alephium.off) {
        try {
          window.alephium.off("accountsChanged", handleAccountsChanged)
        } catch (error) {
          console.error("Error removing Alephium event listener:", error)
        }
      }
    }
  }, [featureName, hasShownModal])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Wallet Connected Successfully
          </DialogTitle>
          <DialogDescription>
            Your Alephium wallet is now connected to the {featureName} feature.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Connected Address:</p>
            <p className="font-mono text-sm break-all">{connectedAddress}</p>
            <p className="text-sm mt-2">
              You now have full access to the {featureName} functionality.
            </p>
          </div>
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setIsOpen(false)}>
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 