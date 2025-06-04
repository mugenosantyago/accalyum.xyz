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

// Constants
const INITIAL_SWEA_AMOUNT = 999;
const SWEA_TOKEN_ID = config.alephium.sweaTokenIdHex;
const SWEA_DECIMALS = config.alephium.sweaDecimals;

export function SweaClaim() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { signer, account, connectionStatus } = useWallet()

  const address = account?.address ?? null
  const isConnected = connectionStatus === 'connected' && !!address
  const isConfigured = true;

  const [yumId, setYumId] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimStatus, setClaimStatus] = useState<'idle' | 'checking_eligibility' | 'requesting_claim' | 'request_submitted' | 'claimed' | 'error'>('idle')

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !signer || !address) {
        toast({ title: t("error"), description: t("connectWalletFirst"), variant: "destructive" })
        return;
    }
    const isDisabled = isProcessing || ['request_submitted', 'claimed'].includes(claimStatus);
    if (isDisabled) return;
    if (!yumId) {
        toast({ title: t("error"), description: t("pleaseEnterYourYumId"), variant: "destructive" })
        return;
    }

    setIsProcessing(true)
    setError(null)
    setClaimStatus('checking_eligibility');

    try {
      logger.info(`Checking eligibility and submitting claim request for YUM ID: ${yumId}, Address: ${address}`);
      const apiResponse = await fetch('/api/swea/claim-requests', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              yumId: yumId,
              requesterAddress: address,
              amount: INITIAL_SWEA_AMOUNT,
              tokenId: SWEA_TOKEN_ID,
          }),
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
          logger.warn(`Claim request failed for ${address}: ${result.error || apiResponse.statusText}`);
          setError(result.error || "Failed to submit claim request.");
          setClaimStatus(result.error?.includes('already claimed') ? 'claimed' : 'error');
          setIsProcessing(false);
          return;
      }

      logger.info(`Claim request submitted successfully for ${address}.`);
      setClaimStatus('request_submitted');
      toast({ title: t("success"), description: "Your sWEA claim request has been submitted for admin review." });
      setYumId("");

    } catch (err) {
      logger.error("sWEA Claim process error:", err)
      let message = "Claim process failed. Please try again.";
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
        <CardTitle className="text-2xl text-center text-purple-300">{t("requestInitialSweaClaim")}</CardTitle>
        <CardDescription className="text-center text-gray-400">
          {t("requestClaimDescription").replace("{amount}", INITIAL_SWEA_AMOUNT.toString())}
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
        ) : claimStatus === 'request_submitted' ? (
          <div className="text-center py-6 text-green-400">
             <Gift className="h-10 w-10 mx-auto mb-2"/>
             <p className="font-semibold">Claim Request Submitted!</p>
             <p className="text-sm text-gray-400">Your request has been sent for admin review. You will receive sWEA after approval and processing.</p>
          </div>
        ) : claimStatus === 'claimed' ? (
            <div className="text-center py-6 text-blue-400">
             <Gift className="h-10 w-10 mx-auto mb-2"/>
             <p className="font-semibold">You have already claimed your initial sWEA.</p>
            </div>
        ) : (
          <form onSubmit={handleClaim} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="yumId" className="text-gray-300">{t("yourYumId")}</Label>
              <Input
                id="yumId"
                type="text"
                placeholder={t("enterYourRegisteredYumId")}
                value={yumId}
                onChange={(e) => setYumId(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-lg text-white"
                disabled={isProcessing || ['request_submitted', 'claimed'].includes(claimStatus)}
              />
            </div>

            {error && (
                <p className="text-sm text-red-500 text-center">Error: {error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isProcessing || !yumId || ['claimed', 'request_submitted'].includes(claimStatus)}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {claimStatus === 'checking_eligibility' ? t("checkingEligibility") : t("submittingRequest")}
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  {t("requestSweaClaimButton").replace("{amount}", INITIAL_SWEA_AMOUNT.toString())}
                </>
              )}
            </Button>
             {claimStatus === 'error' && error && (
                 <Button variant="outline" size="sm" onClick={() => { setError(null); setClaimStatus('idle'); }} className="w-full mt-2">
                    {t("tryAgain")}
                 </Button>
             )}
          </form>
        )}
      </CardContent>
    </Card>
  )
} 