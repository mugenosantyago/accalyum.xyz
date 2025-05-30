"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletStatusDisplay } from "@/components/wallet-status-display"
import { useToast } from "@/components/ui/use-toast"
import { useWallet } from "@alephium/web3-react"
import { useBalance } from "@/components/balance-provider"
import { NodeProvider } from "@alephium/web3"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config"
import Image from 'next/image'
import { BankLedger } from '@/components/bank-ledger'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

// Constants and Interfaces (copied from original page.tsx)
const ONE_ALPH = 10n ** 18n;
const ALPH_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";
const DUST_AMOUNT = 10000n;
const ACYUM_DECIMALS = 7; // Define decimals explicitly

// Add sWEA constants, pulling from config or using placeholders
const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex ?? "YOUR_SWEA_TOKEN_ID_HEX";
const S_WEA_DECIMALS = config.alephium.sweaDecimals ?? 18;

// Re-declare acyumTokenId constant for use throughout the component
const acyumTokenId = config.alephium.acyumTokenIdHex;

interface CandySwapTokenData {
  id: string; 
  collectionTicker: string; 
  name: string;
  slug: string;
  orderBookPrice?: number; 
  totalVolume?: number;
  dailyVolume?: number;
  // Note: CandySwap API doesn't provide token decimals here, we assume it for ACYUM
}

interface NodeTokenBalance {
  id: string;
  amount: string; // API returns amount as string
}

// Expected return type for getAddressesAddressBalance
interface AddressBalance {
  balance: string; // ALPH balance
  tokenBalances?: NodeTokenBalance[]; // Optional array of token balances
  lockedBalance?: string;
  lockedTokenBalances?: NodeTokenBalance[];
  // Other fields might exist depending on the node version
}

function formatBigIntAmount(amount: bigint | undefined | null, decimals: number, displayDecimals: number = 4): string {
  const safeAmount = amount ?? 0n; 
  if (typeof safeAmount !== 'bigint') { 
      console.error("Invalid amount type passed to formatBigIntAmount:", amount);
      return "Error";
  }

  let factor = 1n;
  try {
    if (decimals < 0 || decimals > 100) { 
      throw new Error("Invalid decimals value");
    }
    for (let i = 0; i < decimals; i++) {
        factor *= 10n;
    }
  } catch (e) {
    console.error("Error calculating factor:", e);
    return "Error";
  }

  const integerPart = safeAmount / factor; 
  const fractionalPart = safeAmount % factor; 
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const displayFractional = fractionalString.slice(0, displayDecimals).replace(/0+$/, '');
  return `${integerPart}${displayFractional.length > 0 ? '.' + displayFractional : ''}`;
}

// Renamed component
export default function AcyumFundClient() {
  const { t } = useLanguage()
  const { toast } = useToast()
  
  const {
    signer,
    connectionStatus,
    account
  } = useWallet()

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  
  const { 
    alphBalance: displayAlphBalance,
    acyumBalance: displayAcyumBalance,
    sweaBalance: displaySweaBalance,
    isLoadingBalances,
    balanceError
  } = useBalance();

  const [acyumMarketData, setAcyumMarketData] = useState<CandySwapTokenData | null>(null);
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  const [donateAmount, setDonateAmount] = useState("")
  const [donateTokenType, setDonateTokenType] = useState<"ALPH" | "ACYUM" | "sWEA">("ALPH")
  const [isProcessingDonation, setIsProcessingDonation] = useState(false)

  const bankTreasuryAddress = config.treasury.communist;
  const providerUrl = "https://node.alphaga.app/";

  // Fetch Treasury Balances - Moved outside useEffect and wrapped in useCallback
  // Removed fetchTreasuryBalances function

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsMarketDataLoading(true);
      setMarketDataError(null);
      setAcyumMarketData(null);
      setAlphUsdPrice(null);

      try {
        const [tokenListRes, coingeckoRes] = await Promise.all([
          fetch('/api/candyswap/token-list'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        // Process CandySwap data
        if (!tokenListRes.ok) {
          throw new Error(`CandySwap API error! status: ${tokenListRes.status}`);
        }
        const candySwapData: CandySwapTokenData[] = await tokenListRes.json();
        const acyumData = candySwapData.find(token => token.collectionTicker === acyumTokenId);

        if (acyumData) {
          setAcyumMarketData(acyumData);
          logger.info("Fetched ACYUM market data from CandySwap:", acyumData);
        } else {
          logger.warn(`ACYUM token ID (${acyumTokenId}) not found in CandySwap API response.`);
        }

        // Process CoinGecko data
        if (!coingeckoRes.ok) {
          throw new Error(`CoinGecko API error! status: ${coingeckoRes.status}`);
        }
        const coingeckoData = await coingeckoRes.json();
        const price = coingeckoData?.alephium?.usd;
        if (typeof price === 'number') {
          setAlphUsdPrice(price);
          logger.info(`Fetched ALPH/USD price from CoinGecko: ${price}`);
        } else {
           throw new Error('Invalid data format from CoinGecko API');
        }
        
        if (!acyumData) {
           setMarketDataError("ACYUM data not found on CandySwap.");
        }

      } catch (error) {
        logger.error("Failed to fetch market data:", error);
        const message = error instanceof Error ? error.message : "Failed to load market data";
        setMarketDataError(message);
      } finally {
        setIsMarketDataLoading(false);
      }
    };

    if (acyumTokenId) {
      fetchMarketData();
    } else {
      logger.warn("ACYUM Token ID not configured, skipping market data fetch.");
      setIsMarketDataLoading(false);
      setMarketDataError("ACYUM Token ID not configured.");
    }
  }, [acyumTokenId]);

  // Effect to fetch User's Bank Balance (Uses API) - Keep this useEffect for potential future use/display
  useEffect(() => {
    const fetchUserBankBalance = async () => {
      if (!address || !isConnected) {
        return;
      }
      logger.info(`Fetching bank balance ledger for user: ${address}`);
      try {
        const response = await fetch(`/api/bank/balance/${address}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch user bank balance: ${response.statusText}`);
        }
        const data = await response.json();
        logger.info(`User bank balance fetched: ALPH=${data.alphBalance}, ACYUM=${data.acyumBalance}, sWEA=${data.sweaBalance}`);

      } catch (error) {
        logger.error("Failed to fetch user bank balance:", error);
        const message = error instanceof Error ? error.message : "Could not load deposited balance";
      }
    };

    fetchUserBankBalance();

  }, [address, isConnected]); // Dependencies for this useEffect

  // --- Function to record transaction --- 
  const recordDonation = async (token: 'ALPH' | 'ACYUM' | 'sWEA', amountInSmallestUnit: bigint, txId: string) => {
    logger.info(`Recording donation: ${formatBigIntAmount(amountInSmallestUnit, token === 'ALPH' ? 18 : (token === 'ACYUM' ? ACYUM_DECIMALS : S_WEA_DECIMALS))} ${token} with Tx ID ${txId}`);
    try {
        // Assuming there's an API endpoint to record donations
        const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAddress: address, // Include user address
                token: token,
                amount: amountInSmallestUnit.toString(),
                txId: txId,
                type: 'donation', // Explicitly set type as 'donation'
                // Add timestamp or other relevant info if needed - API handles timestamp
                // initiative: initiativeId // Omit initiativeId for general fund donations
            }),
      });
      if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Failed to record donation on backend: ${response.status}`, errorText);
            toast({
                title: "Donation Recorded (Backend Sync Warning)",
                description: `Your donation Tx ${txId} was submitted, but there was an issue recording it on the backend. The donation is on chain, but might not appear in your history immediately.`, // TODO: Adjust message based on ledger implementation
                variant: "default", // or warning
                duration: 10000
            });
        } else {
            logger.info('Donation successfully recorded on backend.');
            // Optionally trigger a refetch of user's donation history here if implemented
            // fetchUserDonations(); // TODO: Implement fetchUserDonation history fetch on Transactions page
        }
    } catch (error) {
        logger.error("Error recording donation on backend:", error);
        toast({
            title: "Donation Recorded (Backend Sync Warning)",
            description: `Your donation Tx ${txId} was submitted, but there was an issue recording it on the backend. The donation is on chain, but might not appear in your history immediately.`, // TODO: Adjust message based on ledger implementation
            variant: "default", // or warning
            duration: 10000
        });
    }
  };

  const acyumUsdPrice = acyumMarketData?.orderBookPrice && alphUsdPrice
    ? acyumMarketData.orderBookPrice * alphUsdPrice
    : null;

  const handleAlphDonate = async () => {
    if (!isConnected || !address || !signer) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }
    const amountNum = parseFloat(donateAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive ALPH amount to donate.", variant: "destructive" });
      return;
    }
    setIsProcessingDonation(true);
    logger.info(`Client: Signing ALPH donation of ${amountNum} to ${bankTreasuryAddress}`);

    try {
      const amountInSmallestUnit = BigInt(Math.floor(amountNum * (10 ** 18)));
      
      const txResult = await signer.signAndSubmitTransferTx({
        signerAddress: address,
        destinations: [{
           address: bankTreasuryAddress, // Donate directly to the treasury address
           attoAlphAmount: amountInSmallestUnit
        }]
      });

      logger.info(`Client: ALPH Donation successful: Tx ID ${txResult.txId}`);

      recordDonation('ALPH', amountInSmallestUnit, txResult.txId);

      toast({
        title: "Success",
        description: `ALPH donation submitted (Tx: ${txResult.txId})`,
        variant: "default",
      });
      setDonateAmount("");

    } catch (error) {
      logger.error("Error submitting ALPH donation transaction:", error);
      toast({
        title: "Donation Error",
        description: error instanceof Error ? error.message : "Failed to submit ALPH donation",
        variant: "destructive",
      });
    } finally {
      setIsProcessingDonation(false);
    }
  }

  const handleAcyumDonate = async () => {
    if (!isConnected || !address || !signer) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }
    if (!acyumTokenId || acyumTokenId === "") {
        toast({ title: "Configuration Error", description: "ACYUM token ID is not configured.", variant: "destructive" });
        return;
    }
    const amountNum = parseFloat(donateAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive ACYUM amount to donate.", variant: "destructive" });
      return;
    }
    setIsProcessingDonation(true);

    try {
      // ACYUM has 7 decimals based on config.alephium.acyumDecimals
      const acyumDecimals = config.alephium.acyumDecimals ?? 7; // Use fallback if config is not set
      const amountInSmallestUnit = BigInt(Math.floor(amountNum * (10 ** acyumDecimals)));

      logger.info(`Client: Signing ACYUM donation of ${donateAmount} to ${bankTreasuryAddress}`);

      // Use the MakeDeposit script for tokens - assuming MakeDeposit is suitable for direct token transfer to an address
      // Note: If MakeDeposit script is specifically for interacting with a contract, this might need adjustment.
      // For direct token transfer to an address, signAndSubmitTransferTx is more appropriate.
      // Assuming bankTreasuryAddress is a standard address, let's use signAndSubmitTransferTx for consistency.
      const txResult = await signer.signAndSubmitTransferTx({
        signerAddress: address,
         destinations: [{
           address: bankTreasuryAddress, // Donate directly to the treasury address
           attoAlphAmount: DUST_AMOUNT, // Include DUST_AMOUNT for the ALPH part of the UTXO
           tokens: [{
               id: acyumTokenId,
               amount: amountInSmallestUnit
           }]
         }]
      });

      logger.info(`Client: ACYUM Donation successful: Tx ID ${txResult.txId}`);

      recordDonation('ACYUM', amountInSmallestUnit, txResult.txId);

      toast({
        title: "Success",
        description: `ACYUM donation submitted (Tx: ${txResult.txId})`,
        variant: "default",
      });
      setDonateAmount("");

    } catch (error) {
      logger.error("Error submitting ACYUM donation transaction:", error);
      toast({
        title: "Donation Error",
        description: error instanceof Error ? error.message : "Failed to submit ACYUM donation",
        variant: "destructive",
      });
    } finally {
      setIsProcessingDonation(false);
    }
  }

  // Add sWEA deposit handler
  const handleSweaDonate = async () => {
    if (!isConnected || !address || !signer) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }
    if (!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX") { // Check against placeholder too
        toast({ title: "Configuration Error", description: "sWEA token ID is not configured.", variant: "destructive" });
        return;
    }
    const amountNum = parseFloat(donateAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive sWEA amount to donate.", variant: "destructive" });
      return;
    }
    setIsProcessingDonation(true);

    try {
      const sweaDecimals = config.alephium.sweaDecimals ?? 18; // Use fallback if config is not set
      const amountInSmallestUnit = BigInt(Math.floor(amountNum * (10 ** sweaDecimals)));

      logger.info(`Client: Signing sWEA donation of ${donateAmount} to ${bankTreasuryAddress}`);
      
      // Use signAndSubmitTransferTx for direct token transfer
      const txResult = await signer.signAndSubmitTransferTx({
        signerAddress: address,
         destinations: [{
           address: bankTreasuryAddress, // Donate directly to the treasury address
           attoAlphAmount: DUST_AMOUNT, // Include DUST_AMOUNT for the ALPH part of the UTXO
           tokens: [{
               id: S_WEA_TOKEN_ID,
               amount: amountInSmallestUnit
           }]
         }]
      });

      logger.info(`Client: sWEA Donation successful: Tx ID ${txResult.txId}`);

      recordDonation('sWEA', amountInSmallestUnit, txResult.txId);

      toast({
        title: "Success",
        description: `sWEA donation submitted (Tx: ${txResult.txId})`,
        variant: "default",
      });
      setDonateAmount("");

    } catch (error) {
      logger.error("Error submitting sWEA donation transaction:", error);
      toast({
        title: "Donation Error",
        description: error instanceof Error ? error.message : "Failed to submit sWEA donation",
        variant: "destructive",
      });
    } finally {
      setIsProcessingDonation(false);
    }
  }

  const handleDonateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (donateTokenType === 'ALPH') {
      handleAlphDonate();
    } else if (donateTokenType === 'ACYUM') {
      handleAcyumDonate();
    } else if (donateTokenType === 'sWEA') { // Handle sWEA donations
      handleSweaDonate();
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold text-center my-8">Donate to the ACYUM movement and mutual aid funding for indigenous communities</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Treasury Balances Card - Removed */}
            {/* The card that was here has been removed as requested. */}
            {/* It previously displayed the treasury balances. */}
            {/* Main Content Column */} 
             <div className="md:col-span-2 space-y-6">
                {/* User Wallet/Connection Card */}
                {!isConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("pleaseConnectWallet")}</p>
                    <WalletConnectDisplay />
                  </div>
                ) : (
                  <>
                    {/* Wallet Info Card with improved styling and all balances */}
                    <Card className="mb-6 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-gray-900 dark:text-white">{t("yourWallet")}</CardTitle>
                        <CardDescription className="font-mono text-xs break-all text-gray-600 dark:text-gray-400">{address}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingBalances ? (
                          <div className="flex items-center justify-center h-20 text-gray-500 dark:text-gray-400">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading balances...
                          </div>
                        ) : balanceError ? (
                          <div className="text-red-600 dark:text-red-500 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">
                            Error loading balances: {balanceError}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* ALPH Balance */}
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">ALPH Balance</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{displayAlphBalance ?? '0'} ALPH</p>
                              <a 
                                href="https://buy.onramper.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-600 mt-1 inline-block"
                              >
                                Buy ALPH with fiat →
                              </a>
                            </div>
                            {/* ACYUM Balance */}
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">ACYUM Balance</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{displayAcyumBalance ?? '0'} ACYUM</p>
                              {/* Display ACYUM Market Value */}
                              {acyumMarketData?.orderBookPrice !== undefined && alphUsdPrice !== null && displayAcyumBalance && (
                                <>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    ≈ {(Number(displayAcyumBalance.replace(/,/g, '')) * acyumMarketData.orderBookPrice).toFixed(2)} ALPH
                                  </p>
                                  {acyumUsdPrice !== null && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      ≈ ${(Number(displayAcyumBalance.replace(/,/g, '')) * acyumUsdPrice).toFixed(2)} USD
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            {/* sWEA Balance */}
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                <span className="flex items-center gap-1">
                                   <Image src="/IMG_5086_Original.jpg" alt="sWEA" width={14} height={14} className="rounded-full inline-block"/> sWEA Balance
                                </span>
                              </p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{displaySweaBalance ?? '0'} sWEA</p>
                              {/* Potential placeholder for sWEA market value if needed later */}
                            </div>
                          </div>
                        )}
                        <div className="mt-4">
                          <WalletStatusDisplay />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Deposit/Withdraw Tabs - This starts here */} 
                     <Tabs defaultValue="ALPH" className="w-full">
                       <TabsList className="grid w-full grid-cols-3">
                         <TabsTrigger value="ALPH" onClick={() => setDonateTokenType('ALPH')}>ALPH</TabsTrigger>
                         <TabsTrigger value="ACYUM" onClick={() => setDonateTokenType('ACYUM')}>ACYUM</TabsTrigger>
                         <TabsTrigger value="sWEA" onClick={() => setDonateTokenType('sWEA')}>sWEA</TabsTrigger>
                      </TabsList>
                       <TabsContent value="ALPH">
                         <form onSubmit={handleDonateSubmit} className="space-y-4 mt-4">
                          <div className="space-y-2">
                             <Label htmlFor="alphAmountDonate">ALPH Amount to Donate</Label>
                            <Input
                               id="alphAmountDonate"
                              type="number"
                              step="any"
                               min="0.000001"
                               placeholder="1.0"
                               value={donateAmount}
                               onChange={(e) => setDonateAmount(e.target.value)}
                              required
                               className="bg-gray-800 border-gray-700 text-lg"
                            />
                             {/* Display user's ALPH balance */}
                             {displayAlphBalance !== null && (
                                <p className="text-sm text-gray-400">Your balance: {displayAlphBalance} ALPH</p>
                             )}
                          </div>
                          <Button
                            type="submit"
                             className="w-full bg-green-600 hover:bg-green-700"
                             disabled={isProcessingDonation || !donateAmount || parseFloat(donateAmount) <= 0}
                          >
                             {isProcessingDonation ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             ) : <ArrowUp className="mr-2 h-4 w-4" />} {/* Keep arrow up for 'sending' */}
                             Donate ALPH
                          </Button>
                        </form>
                      </TabsContent>
                       <TabsContent value="ACYUM">
                         <form onSubmit={handleDonateSubmit} className="space-y-4 mt-4">
                           <div className="space-y-2">
                             <Label htmlFor="acyumAmountDonate">ACYUM Amount to Donate</Label>
                             <Input
                               id="acyumAmountDonate"
                               type="number"
                               step="any"
                               min="0.0000001"
                               placeholder="10.0"
                               value={donateAmount}
                               onChange={(e) => setDonateAmount(e.target.value)}
                               required
                               className="bg-gray-800 border-gray-700 text-lg"
                             />
                             {/* Display user's ACYUM balance */}
                             {displayAcyumBalance !== null && acyumTokenId && ( // Check acyumTokenId exists before displaying balance
                                 <p className="text-sm text-gray-400">Your balance: {displayAcyumBalance} ACYUM</p>
                            )}
                         </div>
                           <Button
                             type="submit"
                             className="w-full bg-green-600 hover:bg-green-700"
                             disabled={isProcessingDonation || !donateAmount || parseFloat(donateAmount) <= 0}
                           >
                             {isProcessingDonation ? (
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             ) : <ArrowUp className="mr-2 h-4 w-4" />} {/* Keep arrow up for 'sending' */}
                             Donate ACYUM
                           </Button>
                         </form>
                       </TabsContent>
                       <TabsContent value="sWEA">
                          <form onSubmit={handleDonateSubmit} className="space-y-4 mt-4">
                          <div className="space-y-2">
                              <Label htmlFor="sweaAmountDonate">sWEA Amount to Donate</Label>
                            <Input
                                id="sweaAmountDonate"
                              type="number"
                              step="any"
                                min="0.000000001"
                                placeholder="10.0"
                                value={donateAmount}
                                onChange={(e) => setDonateAmount(e.target.value)}
                              required
                                className="bg-gray-800 border-gray-700 text-lg"
                            />
                              {/* Display user's sWEA balance */}
                              {displaySweaBalance !== null && S_WEA_TOKEN_ID && S_WEA_TOKEN_ID !== "YOUR_SWEA_TOKEN_ID_HEX" && ( // Check token ID is configured
                                  <p className="text-sm text-gray-400">Your balance: {displaySweaBalance} sWEA</p>
                              )}
                          </div>
                          <Button
                            type="submit"
                              className="w-full bg-green-600 hover:bg-green-700"
                              disabled={isProcessingDonation || !donateAmount || parseFloat(donateAmount) <= 0}
                          >
                              {isProcessingDonation ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : <ArrowUp className="mr-2 h-4 w-4" />} {/* Keep arrow up for 'sending' */}
                              Donate sWEA
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </>
                )}

                {/* Add Bank Ledger Component - Update props */}
                {isConnected && address && (
                   <BankLedger address={address} bankName="ACYUM Fund Donations" /> // Pass address and a descriptive name
                )}
             </div>
          </div> 
        </main>
        <footer className="bg-gray-800 text-white text-center p-4">
          <p>&copy; {new Date().getFullYear()} ACYUM. All rights reserved.</p>
        </footer>
      </div>
    </ClientLayoutWrapper>
  )
} 