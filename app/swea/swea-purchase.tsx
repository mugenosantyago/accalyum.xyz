"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Info } from "lucide-react"
import { useWallet, useBalance } from "@alephium/web3-react"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { useToast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config" 
import Image from 'next/image'
import { useLanguage } from "@/components/language-provider"

// Helper function copied from other components
function formatBigIntAmount(amount: bigint | undefined | null, decimals: number, displayDecimals: number = 4): string {
    const safeAmount = amount ?? 0n; 
    if (typeof safeAmount !== 'bigint') { 
        console.error("Invalid amount type passed to formatBigIntAmount:", amount);
        return "Error";
    }
    
    if (decimals < 0) { // Basic validation
        console.error("Invalid decimals value:", decimals);
        return "Error";
    }

    let factor = 1n;
    try {
        // Avoid excessively large loops
        if (decimals > 30) throw new Error("Decimals value too large"); 
        for (let i = 0; i < decimals; i++) {
            factor *= 10n;
        }
    } catch (e) {
        console.error("Error calculating factor:", e);
        return "Error";
    }

    // Handle case where factor becomes 0 (shouldn't happen with checks, but defensively)
    if (factor === 0n) factor = 1n;
    
    const integerPart = safeAmount / factor; 
    const fractionalPart = safeAmount % factor; 
    
    if (fractionalPart === 0n) {
        return integerPart.toString();
    }
    
    // Ensure fractional part doesn't exceed available decimals
    const displayDecimalsSafe = Math.max(0, Math.min(decimals, displayDecimals));
    
    const fractionalString = fractionalPart.toString().padStart(decimals, '0');
    const displayFractional = fractionalString.slice(0, displayDecimalsSafe).replace(/0+$/, '');
    
    return `${integerPart}${displayFractional.length > 0 ? '.' + displayFractional : ''}`;
}

// TODO: Replace with actual sWEA details from config once provided
const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex ?? "YOUR_SWEA_TOKEN_ID_HEX"; // Use config if available
const S_WEA_DECIMALS = config.alephium.sweaDecimals ?? 18; // Use config if available, default 18
const S_WEA_CONTRACT_ADDRESS = config.alephium.sweaContractAddress ?? "YOUR_SWEA_CONTRACT_ADDRESS"; // Use config if available

export function SweaPurchase() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { signer, account, connectionStatus } = useWallet()
  const { balance: alphBalanceWei } = useBalance() // Gets ALPH balance by default

  const address = account?.address ?? null
  const isConnected = connectionStatus === 'connected' && !!address

  // Specify TokenBalance type
  interface TokenBalance { id: string; amount: bigint; }

  // Get sWEA balance once ID is known
  const sweaBalanceInfo = account?.tokenBalances?.find((token: TokenBalance) => token.id === S_WEA_TOKEN_ID)
  const sweaBalanceWei = sweaBalanceInfo?.amount ?? 0n

  // Format balances for display
  const displayAlphBalance = formatBigIntAmount(alphBalanceWei ?? 0n, 18, 4)
  const displaySweaBalance = formatBigIntAmount(sweaBalanceWei, S_WEA_DECIMALS, 2)

  const [payAmount, setPayAmount] = useState("")
  const [receiveAmount, setReceiveAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Fixed Price Logic ---
  const SWEA_PER_ALPH = 1 

  const payTokenDecimals = 18; // Always ALPH
  const rate = SWEA_PER_ALPH; // Always ALPH rate

  useEffect(() => {
    const inputNum = parseFloat(payAmount)
    // Simplified effect, rate is always defined number (1)
    if (!isNaN(inputNum) && inputNum > 0) { 
      const calculatedOutput = inputNum * rate * (10 ** S_WEA_DECIMALS / 10 ** payTokenDecimals)
      setReceiveAmount(calculatedOutput.toFixed(S_WEA_DECIMALS > 0 ? 2 : 0))
      setError(null)
    } else {
      setReceiveAmount("")
      setError(null)
    }
    // Only depends on payAmount now (and constants)
  }, [payAmount])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !signer || !address) return toast({ title: t("error"), description: t("connectWalletFirst"), variant: "destructive" })
    if (isProcessing) return
    if (!payAmount || parseFloat(payAmount) <= 0) return toast({ title: t("error"), description: t("sweaErrorInvalidAmount"), variant: "destructive" })
    
    if (S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX" || S_WEA_CONTRACT_ADDRESS === "YOUR_SWEA_CONTRACT_ADDRESS") {
       return toast({ title: t("error"), description: t("sweaErrorConfigNeeded"), variant: "destructive" });
    }
    
    let payAmountBigInt: bigint;
    try {
        // Parsing ALPH amount (always 18 decimals)
        const parts = payAmount.split('.');
        const integerPart = parts[0];
        const fractionalPart = (parts[1] || '').padEnd(18, '0').slice(0, 18);
        payAmountBigInt = BigInt(integerPart + fractionalPart);
    } catch (parseError) {
        logger.error("Error parsing ALPH pay amount to BigInt:", parseError, { payAmount });
        return toast({ title: t("error"), description: t("sweaErrorInvalidAmount"), variant: "destructive" });
    }
    
    // Check ALPH balance
    if ((alphBalanceWei ?? 0n) < payAmountBigInt) {
        const description = t("sweaErrorInsufficientBalance").replace('${token}', 'ALPH');
        return toast({ title: t("error"), description: description, variant: "destructive" })
    }

    setIsProcessing(true)
    setError(null)
    try {
      logger.info(`Simulating sWEA purchase: ${payAmount} ALPH for ${receiveAmount} sWEA`)
      // --- TODO: Replace with actual purchase contract interaction --- 
      // Should likely send ALPH to the S_WEA_CONTRACT_ADDRESS via a script/method call
      // that handles the price check and sWEA transfer.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast({ title: t("success"), description: `Purchased ${receiveAmount} sWEA with ${payAmount} ALPH` })
      setPayAmount("")
      setReceiveAmount("")
    } catch (err) {
      logger.error("sWEA Purchase error (Simulation):", err)
      const message = err instanceof Error ? err.message : t("sweaErrorPurchaseFailed")
      setError(message)
      toast({ title: t("error"), description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const displayRateAlph = SWEA_PER_ALPH !== null ? SWEA_PER_ALPH.toFixed(S_WEA_DECIMALS > 0 ? 2: 0) : "N/A";

  return (
    <Card className="w-full max-w-md mx-auto mt-10 bg-gray-850 border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl text-center gradient-text">{t("sweaPurchaseTitle")}</CardTitle>
        <CardDescription className="text-center text-gray-400">
          {t("sweaPurchaseDescription").replace(' or ACYUM','')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="mb-4 text-amber-600">{t("sweaConnectWalletPrompt")}</p>
            <WalletConnectDisplay />
          </div>
        ) : (
          <form onSubmit={handlePurchase} className="space-y-5">
            {/* Balance Display */}
            <div className="text-xs text-gray-400 space-y-1 border border-gray-700 p-3 rounded-md bg-gray-900">
              <p>{t("sweaYourBalances")}</p>
              <div className="flex justify-between items-center">
                <span>ALPH:</span> 
                <span>{displayAlphBalance}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Image 
                    src="/IMG_5086_Original.jpg"
                    alt="sWEA logo" 
                    width={16}
                    height={16} 
                    className="rounded-full"
                  />
                  sWEA:
                </span> 
                {S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX" 
                    ? <span className="italic text-amber-500">{t("sweaConfigurePrompt")}</span> 
                    : <span>{displaySweaBalance}</span>
                }
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <Label htmlFor="payAmount">{t("sweaAmountToPayLabel")} (ALPH)</Label>
              <Input
                id="payAmount"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-lg"
              />
            </div>

            <div className="flex justify-center items-center text-gray-400">
              &darr; {/* Down Arrow */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiveAmount">{t("sweaYouReceiveLabel")}</Label>
              <Input
                id="receiveAmount"
                type="number"
                placeholder="0.00"
                value={receiveAmount}
                readOnly
                className="bg-gray-700 border-gray-600 text-lg text-gray-300"
              />
            </div>

            {/* Price Display */}
            <div className="text-xs text-gray-400 text-center space-y-1 pt-2 pb-2">
              <p className="font-medium text-gray-300">{t("sweaCurrentRateLabel")}</p>
              <p>1 ALPH ≈ {displayRateAlph} sWEA</p>
              <p className="flex items-center justify-center gap-1 text-blue-400">
                 <Info size={14}/> {t("sweaPriceInfo")}
              </p>
            </div>

            {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
              disabled={isProcessing || !payAmount || !receiveAmount || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX"}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sweaProcessing")}
                </>
              ) : (
                t("sweaPurchaseButton")
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
} 