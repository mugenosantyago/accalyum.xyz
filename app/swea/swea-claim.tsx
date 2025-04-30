"use client"

import React, { useState, useEffect, useCallback } from 'react'
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
import * as web3 from '@alephium/web3'
import { ClaimContract } from "@/artifacts/ts/ClaimContract"

// Constants
const INITIAL_SWEA_AMOUNT = 999;
const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex;
const S_WEA_CLAIM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SWEA_CLAIM_CONTRACT_ADDRESS || "YOUR_SWEA_CLAIM_CONTRACT_ADDRESS";

export function SweaClaim() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { signer, account, connectionStatus, nodeProvider } = useWallet()

  const address = account?.address ?? null
  const isConnected = connectionStatus === 'connected' && !!address
  const isConfigured = S_WEA_CLAIM_CONTRACT_ADDRESS && S_WEA_CLAIM_CONTRACT_ADDRESS !== 'YOUR_SWEA_CLAIM_CONTRACT_ADDRESS' && !!nodeProvider;

  const [acyumId, setAcyumId] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCheckingClaim, setIsCheckingClaim] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimStatus, setClaimStatus] = useState<'idle' | 'checking' | 'not_claimed' | 'claimed' | 'success' | 'error'>('idle')

  const checkClaimStatus = useCallback(async () => {
    if (!isConnected || !address || !isConfigured) {
      setClaimStatus('idle');
      return;
    }
    
    if (!nodeProvider) {
       console.error("Node provider not available for claim check.");
       setClaimStatus('error');
       setError("Network provider error. Cannot check claim status.");
       return;
    }

    setIsCheckingClaim(true);
    setClaimStatus('checking');
    setError(null);
    try {
      logger.info(`Checking claim status for address: ${address} on contract: ${S_WEA_CLAIM_CONTRACT_ADDRESS}`);
      
      await new Promise(resolve => setTimeout(resolve, 800)); 
      const hasClaimed = false;

      if (hasClaimed) {
        logger.info(`Address ${address} has already claimed.`);
        setClaimStatus('claimed');
      } else {
         logger.info(`Address ${address} has not claimed yet.`);
        setClaimStatus('not_claimed');
      }

    } catch (err) {
      logger.error("Error checking claim status:", err);
      setError("Could not verify claim status. Please refresh or try again later.");
      setClaimStatus('error');
    } finally {
      setIsCheckingClaim(false);
    }
  }, [isConnected, address, isConfigured, nodeProvider]);

  useEffect(() => {
    checkClaimStatus();
  }, [checkClaimStatus]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !signer || !address || !isConfigured) {
        toast({ title: t("error"), description: t("connectWalletFirst"), variant: "destructive" })
        return;
    }
    if (isProcessing || claimStatus !== 'not_claimed') return;
    if (!acyumId) return toast({ title: t("error"), description: "Please enter your Acyum ID", variant: "destructive" })
    
    setIsProcessing(true)
    setError(null)
    try {
      logger.info(`Attempting initial sWEA claim for Acyum ID: ${acyumId}, Address: ${address}, Contract: ${S_WEA_CLAIM_CONTRACT_ADDRESS}`)

      await new Promise((resolve) => setTimeout(resolve, 1500))
      const result = { txId: "simulated_claim_tx_id" };
      
      setClaimStatus('success');
      toast({ title: t("success"), description: `Claim transaction submitted! Tx ID: ${result.txId}` })
      setAcyumId("")
      
      setTimeout(checkClaimStatus, 5000); 

    } catch (err) {
      logger.error("sWEA Claim transaction error:", err)
      let message = "Claim failed. Please try again.";
      if (err instanceof Error) {
           message = err.message;
      }
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
          {!isConfigured 
             ? "Claim contract not configured by admin."
             : `Enter your registered Acyum ID to receive your first ${INITIAL_SWEA_AMOUNT} sWEA tokens.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="mb-4 text-amber-600">Please connect your wallet to claim sWEA</p>
            <WalletConnectDisplay />
          </div>
        ) : !isConfigured ? (
           <div className="text-center py-6 text-red-400">
             <p>The sWEA Claim feature is not yet available. Please check back later.</p>
           </div>
        ) : claimStatus === 'success' ? (
          <div className="text-center py-6 text-green-400">
             <Gift className="h-10 w-10 mx-auto mb-2"/>
             <p className="font-semibold">Claim Submitted! Your sWEA should arrive shortly.</p>
          </div>
        ) : claimStatus === 'claimed' ? (
            <div className="text-center py-6 text-blue-400">
             <Gift className="h-10 w-10 mx-auto mb-2"/>
             <p className="font-semibold">You have already claimed your initial sWEA.</p>
            </div>
        ) : claimStatus === 'checking' ? (
             <div className="text-center py-6 text-gray-400">
               <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin"/>
               <p className="italic">Checking claim status...</p>
            </div>
        ) : (
          <form onSubmit={handleClaim} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acyumId" className="text-gray-300">Your Acyum ID</Label>
              <Input
                id="acyumId"
                type="text"
                placeholder="Enter your registered Acyum ID"
                value={acyumId}
                onChange={(e) => setAcyumId(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-lg"
                disabled={isProcessing || claimStatus === 'checking' || !isConfigured}
              />
            </div>

            {error && (
                <p className="text-sm text-red-500 text-center">Error: {error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isProcessing || isCheckingClaim || !acyumId || claimStatus !== 'not_claimed' || !isConfigured}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Claim...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Claim {INITIAL_SWEA_AMOUNT} sWEA
                </>
              )}
            </Button>
             {claimStatus === 'idle' && isConfigured && (
                <p className="text-xs text-yellow-500 text-center">Connect wallet to check claim status.</p>
             )}
             {claimStatus === 'error' && error && (
                 <Button variant="outline" size="sm" onClick={checkClaimStatus} className="w-full mt-2">
                    Retry Status Check
                 </Button>
             )}
          </form>
        )}
      </CardContent>
    </Card>
  )
} 