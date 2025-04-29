"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Info } from "lucide-react"
import { useWallet, useBalance } from "@alephium/web3-react"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { useToast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config" 
import Image from 'next/image'

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

export function SweaSwap() {
  const { toast } = useToast()
  const { signer, account, connectionStatus } = useWallet()
  const { balance: alphBalanceWei } = useBalance() // Gets ALPH balance by default

  const address = account?.address ?? null
  const isConnected = connectionStatus === 'connected' && !!address

  // Specify TokenBalance type
  interface TokenBalance { id: string; amount: bigint; }

  // Assuming ACYUM details are in config
  const acyumTokenId = config.alephium.acyumTokenIdHex
  const acyumBalanceInfo = account?.tokenBalances?.find((token: TokenBalance) => token.id === acyumTokenId)
  const acyumBalanceWei = acyumBalanceInfo?.amount ?? 0n

  // Get sWEA balance once ID is known
  const sweaBalanceInfo = account?.tokenBalances?.find((token: TokenBalance) => token.id === S_WEA_TOKEN_ID)
  const sweaBalanceWei = sweaBalanceInfo?.amount ?? 0n

  // Format balances for display
  const displayAlphBalance = formatBigIntAmount(alphBalanceWei ?? 0n, 18, 4)
  const displayAcyumBalance = formatBigIntAmount(acyumBalanceWei, config.alephium.acyumDecimals, 2)
  const displaySweaBalance = formatBigIntAmount(sweaBalanceWei, S_WEA_DECIMALS, 2)

  const [payAmount, setPayAmount] = useState("")
  const [receiveAmount, setReceiveAmount] = useState("")
  const [payToken, setPayToken] = useState<'ALPH' | 'ACYUM'>("ALPH")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Fixed Price Logic ---
  const SWEA_PER_ALPH = 1 
  const SWEA_PER_ACYUM: number | null = null; // Explicitly null for now, allows potential number assignment later

  const payTokenDecimals = payToken === 'ALPH' ? 18 : config.alephium.acyumDecimals
  // Rate can now be number or null
  const rate = payToken === 'ALPH' ? SWEA_PER_ALPH : SWEA_PER_ACYUM

  useEffect(() => {
    const inputNum = parseFloat(payAmount)
    // Check if rate is a valid number
    if (!isNaN(inputNum) && inputNum > 0 && rate !== null) { 
      const calculatedOutput = inputNum * rate * (10 ** S_WEA_DECIMALS / 10 ** payTokenDecimals)
      setReceiveAmount(calculatedOutput.toFixed(S_WEA_DECIMALS > 0 ? 2 : 0))
      setError(null)
    } else if (payToken === 'ACYUM' && rate === null) { // Explicitly check for null rate
      setReceiveAmount("")
      setError("ACYUM swap rate not set.")
    } else {
      setReceiveAmount("")
      setError(null)
    }
    // Depend on rate directly
  }, [payAmount, payToken, rate, payTokenDecimals])

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !signer || !address) return toast({ title: "Error", description: "Please connect wallet", variant: "destructive" })
    if (isProcessing) return
    if (!payAmount || parseFloat(payAmount) <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" })
    // Check if rate is null when trying to pay with ACYUM
    if (payToken === 'ACYUM' && rate === null) return toast({ title: "Error", description: "ACYUM swap rate not available", variant: "destructive" })
    
    // Check if sWEA details are configured
    if (S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX" || S_WEA_CONTRACT_ADDRESS === "YOUR_SWEA_CONTRACT_ADDRESS") {
       return toast({ title: "Configuration Error", description: "sWEA token details not configured.", variant: "destructive" });
    }
    
    // Basic balance check
    let payAmountBigInt: bigint;
    try {
        if(payTokenDecimals > 0) {
           const parts = payAmount.split('.');
           const integerPart = parts[0];
           const fractionalPart = (parts[1] || '').padEnd(payTokenDecimals, '0').slice(0, payTokenDecimals);
           payAmountBigInt = BigInt(integerPart + fractionalPart);
        } else {
           payAmountBigInt = BigInt(Math.floor(parseFloat(payAmount)));
        } 
    } catch (parseError) {
        logger.error("Error parsing pay amount to BigInt:", parseError, { payAmount, payTokenDecimals });
        return toast({ title: "Error", description: "Invalid input amount format.", variant: "destructive" });
    }
    
    const hasEnoughBalance = payToken === 'ALPH' 
        ? (alphBalanceWei ?? 0n) >= payAmountBigInt
        : acyumBalanceWei >= payAmountBigInt
        
    if (!hasEnoughBalance) {
        return toast({ title: "Error", description: `Insufficient ${payToken} balance`, variant: "destructive" })
    }

    setIsProcessing(true)
    setError(null)
    try {
      logger.info(`Simulating sWEA purchase: ${payAmount} ${payToken} for ${receiveAmount} sWEA`)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast({ title: "Swap Submitted (Simulation)", description: `Purchasing ${receiveAmount} sWEA with ${payAmount} ${payToken}` })
      setPayAmount("")
      setReceiveAmount("")
    } catch (err) {
      logger.error("sWEA Swap error (Simulation):", err)
      const message = err instanceof Error ? err.message : "Purchase failed. Please try again."
      setError(message)
      toast({ title: "sWEA Purchase Failed (Simulation)", description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  // Pre-format rates for display
  const displayRateAlph = SWEA_PER_ALPH !== null ? SWEA_PER_ALPH.toFixed(S_WEA_DECIMALS > 0 ? 2: 0) : "N/A";
  const displayRateAcyum = null; // Set to null directly to resolve linter error

  return (
    <Card className="w-full max-w-md mx-auto mt-10 bg-gray-850 border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl text-center gradient-text">Purchase sWEA</CardTitle>
        <CardDescription className="text-center text-gray-400">
          Acquire sWEA using ALPH or ACYUM. Price is community-governed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="mb-4 text-amber-600">Please connect your wallet to purchase sWEA</p>
            <WalletConnectDisplay />
          </div>
        ) : (
          <form onSubmit={handleSwap} className="space-y-5">
            {/* Balance Display */}
            <div className="text-xs text-gray-400 space-y-1 border border-gray-700 p-3 rounded-md bg-gray-900">
              <p>Your Balances:</p>
              <div className="flex justify-between items-center">
                <span>ALPH:</span> 
                <span>{displayAlphBalance}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Image src="/images/logo.png" alt="ACYUM logo" width={16} height={16} className="rounded-full" />ACYUM:</span> 
                <span>{displayAcyumBalance}</span>
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
                    ? <span className="italic text-amber-500"> (Configure sWEA)</span> 
                    : <span>{displaySweaBalance}</span>
                }
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <Label htmlFor="payToken">You Pay With</Label>
              <Select value={payToken} onValueChange={(value: 'ALPH' | 'ACYUM') => setPayToken(value)}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select payment token" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="ALPH">ALPH</SelectItem>
                  <SelectItem value="ACYUM">ACYUM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payAmount">Amount to Pay</Label>
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
              <Label htmlFor="receiveAmount">You Receive (sWEA)</Label>
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
              <p className="font-medium text-gray-300">Current Rate (Community Governed):</p>
              <p>1 ALPH ≈ {displayRateAlph} sWEA</p>
              {displayRateAcyum !== null ? (
                 <p>1 ACYUM ≈ {displayRateAcyum} sWEA</p>
              ) : (
                 <p className="italic text-amber-500">(ACYUM rate not yet determined)</p> 
              )}
              <p className="flex items-center justify-center gap-1 text-blue-400">
                 <Info size={14}/> Price set initially, adjustable by community vote.
              </p>
            </div>

            {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
              disabled={isProcessing || !payAmount || !receiveAmount || (payToken === 'ACYUM' && rate === null) || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX"}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Purchase sWEA"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
} 