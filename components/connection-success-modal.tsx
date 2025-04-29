"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { useWallet } from "@alephium/web3-react"

interface ConnectionSuccessModalProps {
  featureName: string
}

export function ConnectionSuccessModal({ featureName }: ConnectionSuccessModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasShown, setHasShown] = useState(false)
  
  const { connectionStatus } = useWallet();
  const isConnected = connectionStatus === 'connected';

  useEffect(() => {
    if (isConnected && !hasShown) {
      console.log(`ConnectionSuccessModal: Wallet connected for ${featureName}. Opening modal.`)
      setIsOpen(true)
      setHasShown(true)
    } else if (!isConnected) {
      console.log(`ConnectionSuccessModal: Wallet disconnected for ${featureName}. Resetting modal.`)
      setHasShown(false)
      setIsOpen(false)
    }
  }, [isConnected, hasShown, featureName])

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Wallet Connected Successfully
          </DialogTitle>
          <DialogDescription>
            Your wallet is now connected. You can use the {featureName} features.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleClose}>
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 