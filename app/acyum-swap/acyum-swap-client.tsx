"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { useWallet } from "@alephium/web3-react"
import { useToast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config"

interface CandySwapTokenData {
  id: string;
  collectionTicker: string;
  name: string;
  slug: string;
  decimals?: number;
  orderBookPrice?: number; // ACYUM per ALPH
  totalVolume?: number;
  dailyVolume?: number;
}

// Renamed component
export default function AcyumSwapClient() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { 
    signer,
    account, 
    connectionStatus,
  } = useWallet()
  
  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  
  const [inputAmount, setInputAmount] = useState("")
  const [outputAmount, setOutputAmount] = useState("")
  const [isBuyingAcyum, setIsBuyingAcyum] = useState(true)

  const [isProcessing, setIsProcessing] = useState(false)

  // Use the contract address for CandySwap API lookup
  const acyumContractAddressForAPI = config.alephium.acyumContractAddress;
  const acyumTokenId = config.alephium.acyumTokenIdHex; // Keep hex ID if needed elsewhere
  const ACYUM_DECIMALS = 7; // Define decimals explicitly

  // Rename state to hold raw data
  const [rawAcyumMarketData, setRawAcyumMarketData] = useState<CandySwapTokenData | null>(null); 
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  // Calculated Rates State - Set Fixed Rates
  const fixedAlphPerAcyumRate = 0.7;
  const fixedAcyumPerAlphRate = 1 / fixedAlphPerAcyumRate; // Approx 1.42857...
  const [acyumPerAlphRate, setAcyumPerAlphRate] = useState<number | undefined>(fixedAcyumPerAlphRate);
  const [alphPerAcyumRate, setAlphPerAcyumRate] = useState<number | undefined>(fixedAlphPerAcyumRate);

  useEffect(() => {
    // Renamed function to reflect it fetches more than just swap rates now
    async function fetchExternalData() { 
      setIsMarketDataLoading(true); 
      setMarketDataError(null); 
      setRawAcyumMarketData(null); // Reset raw data
      setAlphUsdPrice(null); // Reset price
      // Rates are fixed, no need to reset/set them here

      try {
        // Fetch token list via proxy (for volume/metadata) and ALPH price from CoinGecko
        const [tokenListRes, coingeckoRes] = await Promise.all([
          fetch('/api/candyswap/token-list'), 
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        // Process CandySwap Token List (for volume/metadata, NOT price)
        if (!tokenListRes.ok) {
           const errorText = await tokenListRes.text();
           logger.error(`CandySwap API Error: ${tokenListRes.status}`, errorText);
           // Set error but continue to fetch coingecko if possible
           setMarketDataError(`CandySwap API error! status: ${tokenListRes.status}`); 
        } else {
            const tokenListData: CandySwapTokenData[] = await tokenListRes.json();
            // Find ACYUM using the collectionTicker
            const acyumData = tokenListData.find(token => token.collectionTicker === acyumContractAddressForAPI); 
            if (acyumData) {
              setRawAcyumMarketData(acyumData); // Store raw data for volume etc.
              logger.info("Fetched ACYUM market metadata/volume for Swap page:", acyumData);
              // No longer calculating rate from acyumData.orderBookPrice
            } else {
              logger.warn(`ACYUM contract address (${acyumContractAddressForAPI}) not found in CandySwap API response.`);
              // Don't necessarily set an error, metadata/volume might just be unavailable
            }
        }

        // Process CoinGecko Price Data
        if (!coingeckoRes.ok) {
           const errorText = await coingeckoRes.text();
           logger.error(`CoinGecko API Error: ${coingeckoRes.status}`, errorText);
           // Append error message
           setMarketDataError(prev => prev ? `${prev} & CoinGecko API error! status: ${coingeckoRes.status}` : `CoinGecko API error! status: ${coingeckoRes.status}`);
        } else {
            const coingeckoData = await coingeckoRes.json();
            const price = coingeckoData?.alephium?.usd;
            if (typeof price === 'number') {
               setAlphUsdPrice(price);
               logger.info(`Fetched ALPH/USD price for Swap page: ${price}`);
            } else {
               logger.error('Invalid data format from CoinGecko API', coingeckoData);
               // Append error message
               setMarketDataError(prev => prev ? `${prev} & Invalid price data format from CoinGecko API` : 'Invalid price data format from CoinGecko API');
            }
        }
        
        // Log the fixed rates being used regardless of API success/failure
        logger.info(`Using FIXED rates: ${fixedAcyumPerAlphRate.toFixed(2)} ACYUM/ALPH, ${fixedAlphPerAcyumRate.toFixed(1)} ALPH/ACYUM`);


      } catch (error) { // Catch unexpected errors during fetch/processing
        logger.error("Failed to fetch external data for Swap page:", error);
        const message = error instanceof Error ? error.message : "Failed to load market data";
        // Append error message
        setMarketDataError(prev => prev ? `${prev} & ${message}` : message);
      } finally {
        setIsMarketDataLoading(false);
      }
    };

    if (acyumContractAddressForAPI) { // Check if address is configured
       fetchExternalData();
    } else {
       setIsMarketDataLoading(false);
       setMarketDataError("ACYUM Contract Address not configured.");
       logger.warn("ACYUM Contract Address not configured, skipping external data fetch.");
       // Still log the fixed rates being used
       logger.info(`Using FIXED rates: ${fixedAcyumPerAlphRate.toFixed(2)} ACYUM/ALPH, ${fixedAlphPerAcyumRate.toFixed(1)} ALPH/ACYUM`);
    }
    // Dependency array only needs acyumContractAddressForAPI for the fetch trigger.
  }, [acyumContractAddressForAPI]);

  // Use calculated rates for output calculation
  useEffect(() => {
    const inputNum = parseFloat(inputAmount);
    // Check if rates are calculated and valid numbers
    if (!isNaN(inputNum) && inputNum > 0 && acyumPerAlphRate !== undefined && alphPerAcyumRate !== undefined) {
      const calculatedOutput = isBuyingAcyum 
        ? inputNum * acyumPerAlphRate // ALPH input * (ACYUM/ALPH rate)
        : inputNum * alphPerAcyumRate; // ACYUM input * (ALPH/ACYUM rate)
      // Adjust precision based on output token
      setOutputAmount(calculatedOutput.toFixed(isBuyingAcyum ? 2 : 6)); // More precision for ALPH output
    } else {
      setOutputAmount("");
    }
  }, [inputAmount, isBuyingAcyum, acyumPerAlphRate, alphPerAcyumRate]);

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !signer || !address) return toast({ title: "Error", description: "Please connect wallet", variant: "destructive" });
    if (isMarketDataLoading || marketDataError) return toast({ title: "Error", description: "Market data not loaded", variant: "destructive" });
    if (!inputAmount || parseFloat(inputAmount) <= 0) return toast({ title: "Error", description: "Invalid input amount", variant: "destructive" });
    if (!outputAmount || parseFloat(outputAmount) <= 0) return toast({ title: "Error", description: "Invalid output amount (check rate)", variant: "destructive" });
    if (!acyumTokenId) return toast({ title: "Error", description: "ACYUM Token ID missing", variant: "destructive" });
    
    setIsProcessing(true)
    try {
      logger.info(`Simulating swap: ${inputAmount} ${isBuyingAcyum ? 'ALPH' : 'ACYUM'} for ${outputAmount} ${isBuyingAcyum ? 'ACYUM' : 'ALPH'}`);
      // TODO: Implement actual swap logic using CandySwap contracts/SDK or scripts
      // Example: Might involve a script call like SwapScript.execute(...)
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
      
      toast({ title: "Swap Submitted (Simulation)", description: `Swapping ${inputAmount} ${isBuyingAcyum ? 'ALPH' : 'ACYUM'}` });
      setInputAmount("");
      setOutputAmount("");
    } catch (error) {
      logger.error("Swap error (Simulation):", error);
      const message = error instanceof Error ? error.message : "Please try again."
      toast({ title: "Swap Failed (Simulation)", description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleSwapDirection = () => {
    setIsBuyingAcyum(!isBuyingAcyum);
    setInputAmount("");
    setOutputAmount("");
  };
  
  const inputToken = isBuyingAcyum ? "ALPH" : "ACYUM";
  const outputToken = isBuyingAcyum ? "ACYUM" : "ALPH";

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("tradeTokens")}</h1>

          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>acyumSwap</CardTitle>
                <CardDescription>{t('buyAndSell')}</CardDescription>
              </CardHeader>

              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("accessTradingFeatures")}</p>
                    <WalletConnectDisplay />
                  </div>
                ) : isMarketDataLoading ? (
                   <div className="flex justify-center py-12">
                     <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                     <p className="ml-2">Loading market data...</p>
                   </div>
                ) : marketDataError ? (
                   <div className="text-center py-4 text-red-500">
                     <p>Error loading market data: {marketDataError}</p>
                   </div>
                ) : (
                  <form onSubmit={handleSwap} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inputAmount">You Pay ({inputToken})</Label>
                      <Input
                        id="inputAmount"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        required
                        className="bg-gray-800 border-gray-700 text-lg"
                      />
                      {alphUsdPrice && inputAmount && parseFloat(inputAmount) > 0 && (
                        <p className="text-xs text-gray-400">
                          ≈ ${ 
                            (parseFloat(inputAmount) * (isBuyingAcyum ? alphUsdPrice : (alphPerAcyumRate ? alphPerAcyumRate * alphUsdPrice : 0)))
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          } USD
                        </p>
                      )}
                    </div>

                    <div className="flex justify-center items-center">
                       <Button type="button" variant="ghost" size="icon" onClick={toggleSwapDirection} aria-label="Toggle swap direction">
                          <ArrowLeftRight className="h-5 w-5 text-gray-400 hover:text-[#FF6B35]"/>
                       </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="outputAmount">You Receive ({outputToken})</Label>
                      <Input
                        id="outputAmount"
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={outputAmount} 
                        readOnly
                        className="bg-gray-700 border-gray-600 text-lg text-gray-300"
                      />
                      {alphUsdPrice && outputAmount && parseFloat(outputAmount) > 0 && (
                        <p className="text-xs text-gray-400">
                           ≈ ${ 
                            (parseFloat(outputAmount) * (isBuyingAcyum ? (alphPerAcyumRate ? alphPerAcyumRate * alphUsdPrice : 0) : alphUsdPrice))
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          } USD
                        </p>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 text-center space-y-1 pt-2 pb-2">
                        {/* Always display fixed rates if available (state is initialized) */}
                        {acyumPerAlphRate !== undefined && alphPerAcyumRate !== undefined ? (
                            <>
                                {/* Displaying fixed rates */}
                                <p>1 ALPH ≈ {acyumPerAlphRate.toFixed(2)} ACYUM</p> 
                                <p>1 ACYUM ≈ {alphPerAcyumRate.toFixed(1)} ALPH</p> {/* Adjusted precision to .toFixed(1) for 0.7 */}
                                {alphUsdPrice ? <p>(1 ALPH ≈ ${alphUsdPrice.toFixed(3)} USD)</p> : <p>(USD rate unavailable)</p>}
                            </>
                        ) : (
                            // This case should theoretically not happen with fixed rates initialized
                            <p>Rate unavailable.</p> 
                        )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                      disabled={isProcessing || !inputAmount || !outputAmount || acyumPerAlphRate === undefined || alphPerAcyumRate === undefined}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("processing")}
                        </>
                      ) : (
                        "Swap"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
} 