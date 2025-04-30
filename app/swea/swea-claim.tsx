"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Gift } from "lucide-react"
import { useWallet } from "@alephium/web3-react"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { useToast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { useLanguage } from "@/components/language-provider"
import { config } from "@/lib/config"

// TODO: Define constants or pull from config if claim amount/logic changes
const INITIAL_SWEA_AMOUNT = 999;
const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex ?? "YOUR_SWEA_TOKEN_ID_HEX";
const S_WEA_CONTRACT_ADDRESS = config.alephium.sweaContractAddress ?? "YOUR_SWEA_CONTRACT_ADDRESS";

export function SweaClaim() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { signer, account, connectionStatus } = useWallet()

  const address = account?.address ?? null
  const isConnected = connectionStatus === 'connected' && !!address

  const [acyumId, setAcyumId] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimStatus, setClaimStatus] = useState<'idle' | 'success' | 'already_claimed' | 'error'>('idle') // Add state to track if claimed

  // TODO: Add logic here to check if the connected address has already claimed
  // This might involve querying the sWEA contract state or a backend database
  useEffect(() => {
    const checkClaimStatus = async () => {
      if (!isConnected || !address || !S_WEA_CONTRACT_ADDRESS || S_WEA_CONTRACT_ADDRESS === 'YOUR_SWEA_CONTRACT_ADDRESS') return;
      // Placeholder: Query contract/backend to see if `address` has claimed
      // Example: const hasClaimed = await checkClaimStatusOnContract(address);
      // if (hasClaimed) setClaimStatus('already_claimed');
    };
    checkClaimStatus();
  }, [isConnected, address]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !signer || !address) return toast({ title: t("error"), description: t("connectWalletFirst"), variant: "destructive" })
    if (isProcessing) return
    if (!acyumId) return toast({ title: t("error"), description: "Please enter your Acyum ID", variant: "destructive" }) // Add specific error
    if (claimStatus === 'already_claimed') return toast({ title: "Info", description: "You have already claimed your initial sWEA.", variant: "default" })
    if (!S_WEA_CONTRACT_ADDRESS || S_WEA_CONTRACT_ADDRESS === 'YOUR_SWEA_CONTRACT_ADDRESS') {
       return toast({ title: t("error"), description: t("sweaErrorConfigNeeded"), variant: "destructive" });
    }

    setIsProcessing(true)
    setError(null)
    try {
      logger.info(`Attempting initial sWEA claim for Acyum ID: ${acyumId}, Address: ${address}`)

      // --- TODO: Replace with actual claim contract interaction --- 
      // This will likely involve calling a specific method on the S_WEA_CONTRACT_ADDRESS
      // passing the acyumId and potentially the recipient address (signer.address)
      // Example: await ClaimInitialSweaScript.execute(signer, { acyumId: acyumId, recipient: address, contract: S_WEA_CONTRACT_ADDRESS })
      
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate network delay
      
      setClaimStatus('success'); // Assume success for simulation
      toast({ title: t("success"), description: `Successfully claimed ${INITIAL_SWEA_AMOUNT} sWEA!` })
      setAcyumId("") // Clear input on success
      // Consider triggering a balance refresh here

    } catch (err) {
      logger.error("sWEA Claim error (Simulation):", err)
      // TODO: Potentially check error message for specific contract errors like "Already Claimed" or "Invalid ID"
      const message = err instanceof Error ? err.message : "Claim failed. Please try again."
      setError(message)
      setClaimStatus('error');
      toast({ title: "Claim Failed", description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-10 bg-gradient-to-br from-purple-900/30 via-gray-850 to-gray-850 border-purple-600/50">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-purple-300">Claim Initial sWEA</CardTitle>
        <CardDescription className="text-center text-gray-400">
          Enter your registered Acyum ID to receive your first {INITIAL_SWEA_AMOUNT} sWEA tokens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="mb-4 text-amber-600">Please connect your wallet to claim sWEA</p>
            <WalletConnectDisplay />
          </div>
        ) : claimStatus === 'success' ? (
          <div className="text-center py-6 text-green-400">
             <Gift className="h-10 w-10 mx-auto mb-2"/>
             <p className="font-semibold">You have successfully claimed your initial sWEA!</p>
          </div>
        ) : claimStatus === 'already_claimed' ? (
            <div className="text-center py-6 text-blue-400">
             <Gift className="h-10 w-10 mx-auto mb-2"/>
             <p className="font-semibold">You have already claimed your initial sWEA.</p>
            </div>
        ) : (
          <form onSubmit={handleClaim} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acyumId" className="text-gray-300">Your Acyum ID</Label>
              <Input
                id="acyumId"
                type="text" // Or appropriate type for the ID
                placeholder="Enter your registered Acyum ID" 
                value={acyumId}
                onChange={(e) => setAcyumId(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-lg"
              />
            </div>

            {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isProcessing || !acyumId || claimStatus !== 'idle' || !S_WEA_CONTRACT_ADDRESS || S_WEA_CONTRACT_ADDRESS === 'YOUR_SWEA_CONTRACT_ADDRESS'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Claim...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Claim {INITIAL_SWEA_AMOUNT} sWEA
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
} 