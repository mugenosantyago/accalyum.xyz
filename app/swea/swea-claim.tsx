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
import { DUST_AMOUNT } from '@alephium/web3'
import { TokenFaucet } from "@/artifacts/ts/TokenFaucet"

// Constants
const INITIAL_SWEA_AMOUNT = 999;
const SWEA_TOKEN_ID = config.alephium.sweaTokenIdHex;
const SWEA_DECIMALS = config.alephium.sweaDecimals;
const SWEA_FAUCET_ADDRESS = config.alephium.sweaFaucetAddress;
const AMOUNT_TO_WITHDRAW_ATOMIC = BigInt(INITIAL_SWEA_AMOUNT) * (10n ** BigInt(SWEA_DECIMALS));

export function SweaClaim() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { signer, account, connectionStatus } = useWallet()

  const address = account?.address ?? null
  const isConnected = connectionStatus === 'connected' && !!address
  const isConfigured = !!SWEA_FAUCET_ADDRESS && SWEA_FAUCET_ADDRESS !== 'YOUR_SWEA_CLAIM_CONTRACT_ADDRESS';

  const [acyumId, setAcyumId] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimStatus, setClaimStatus] = useState<'idle' | 'eligible' | 'checking_db' | 'claimed' | 'submitting_tx' | 'tx_submitted' | 'error'>('idle')

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !signer || !address) {
        toast({ title: t("error"), description: t("connectWalletFirst"), variant: "destructive" })
        return;
    }
    const isDisabled = isProcessing || ['claimed', 'submitting_tx', 'tx_submitted'].includes(claimStatus);
    if (isDisabled) return;
    if (!acyumId) {
        toast({ title: t("error"), description: "Please enter your Acyum ID", variant: "destructive" })
        return;
    }

    setIsProcessing(true)
    setError(null)
    setClaimStatus('checking_db');

    try {
      logger.info(`Checking eligibility for Acyum ID: ${acyumId}, Address: ${address}`);
      const apiResponse = await fetch('/api/claim-swea', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ acyumId, claimingAddress: address }),
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok || !result.eligible) {
          logger.warn(`Eligibility check failed for ${address}: ${result.message}`);
          setError(result.message || "Eligibility check failed.");
          setClaimStatus(result.message?.includes('already claimed') ? 'claimed' : 'error');
          setIsProcessing(false);
          return;
      }

      logger.info(`Eligibility confirmed for ${address}. Proceeding with faucet withdraw transaction.`);
      setClaimStatus('submitting_tx');

      const tx = await TokenFaucet.withdraw(signer, {
          initialFields: {
             address: SWEA_FAUCET_ADDRESS,
             asset: { alphAmount: 0n, tokens: [] }
          },
          attoAlphAmount: DUST_AMOUNT,
          args: { amount: AMOUNT_TO_WITHDRAW_ATOMIC }
      });

      logger.info(`Claim transaction submitted: ${tx.txId} for address: ${address}`);
      setClaimStatus('tx_submitted');
      toast({ title: t("success"), description: `Claim transaction submitted! Tx ID: ${tx.txId}. Please wait for confirmation.` })
      setAcyumId("");

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
        <CardTitle className="text-2xl text-center text-purple-300">Claim Initial sWEA</CardTitle>
        <CardDescription className="text-center text-gray-400">
          {!isConfigured
             ? "Claim feature not configured by admin."
             : `Enter your registered Acyum ID to claim your first ${INITIAL_SWEA_AMOUNT} sWEA tokens via the faucet contract.`
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
        ) : claimStatus === 'tx_submitted' ? (
          <div className="text-center py-6 text-green-400">
             <Gift className="h-10 w-10 mx-auto mb-2"/>
             <p className="font-semibold">Claim Transaction Submitted! Your sWEA should arrive after confirmation.</p>
          </div>
        ) : claimStatus === 'claimed' ? (
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
                type="text"
                placeholder="Enter your registered Acyum ID"
                value={acyumId}
                onChange={(e) => setAcyumId(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-lg"
                disabled={isProcessing || ['claimed', 'tx_submitted'].includes(claimStatus)}
              />
            </div>

            {error && (
                <p className="text-sm text-red-500 text-center">Error: {error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isProcessing || !acyumId || ['claimed', 'tx_submitted'].includes(claimStatus) || !isConfigured}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {claimStatus === 'checking_db' ? 'Checking Eligibility...' : 'Submitting Claim...'}
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Claim {INITIAL_SWEA_AMOUNT} sWEA
                </>
              )}
            </Button>
             {claimStatus === 'error' && error && (
                 <Button variant="outline" size="sm" onClick={() => { setError(null); setClaimStatus('idle'); }} className="w-full mt-2">
                    Try Again
                 </Button>
             )}
          </form>
        )}
      </CardContent>
    </Card>
  )
} 