import React, { useState, useEffect, useCallback } from 'react'
import type { Metadata } from 'next'
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

// Add metadata for the Acyum Swap page
export const metadata: Metadata = {
  title: 'Acyum Swap', // Uses template: "Acyum Swap | ACYUM"
  description: 'Swap ALPH and ACYUM tokens seamlessly on the Alephium blockchain using the Acyum Swap interface. View live market rates.',
  keywords: ['Alephium', 'ACYUM', 'Swap', 'Exchange', 'Token', 'ALPH', 'DeFi', 'Crypto'],
};

// Client Component containing the page logic
"use client"
function AcyumSwapClient() {
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

  const [acyumMarketData, setAcyumMarketData] = useState<CandySwapTokenData | null>(null);
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  const acyumTokenId = config.alephium.acyumTokenId;

  useEffect(() => {
    setIsMarketDataLoading(true);
    setMarketDataError(null);
    const fetchMarketData = async () => {
      try {
        const [candySwapResponse, coingeckoResponse] = await Promise.all([
          fetch('https://candyswap.gg/api/token-list'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        if (!candySwapResponse.ok) throw new Error(`CandySwap API error! status: ${candySwapResponse.status}`);
        const candySwapData: CandySwapTokenData[] = await candySwapResponse.json();
        const acyumData = candySwapData.find(token => token.collectionTicker === acyumTokenId);
        if (acyumData) {
          setAcyumMarketData(acyumData);
          logger.info("Fetched ACYUM market data for Swap page:", acyumData);
        } else {
          logger.warn(`ACYUM token ID (${acyumTokenId}) not found in CandySwap API response.`);
        }

        if (!coingeckoResponse.ok) throw new Error(`CoinGecko API error! status: ${coingeckoResponse.status}`);
        const coingeckoData = await coingeckoResponse.json();
        const price = coingeckoData?.alephium?.usd;
        if (typeof price === 'number') {
          setAlphUsdPrice(price);
          logger.info(`Fetched ALPH/USD price for Swap page: ${price}`);
        } else {
          throw new Error('Invalid data format from CoinGecko API');
        }
        
        if (!acyumData) setMarketDataError("ACYUM data not found on CandySwap.");

      } catch (error) {
        logger.error("Failed to fetch market data for Swap page:", error);
        const message = error instanceof Error ? error.message : "Failed to load market data";
        setMarketDataError(message);
      } finally {
        setIsMarketDataLoading(false);
      }
    };
    if (acyumTokenId) fetchMarketData();
    else {
       setIsMarketDataLoading(false);
       setMarketDataError("ACYUM Token ID not configured.");
    }
  }, [acyumTokenId]);

  const acyumPerAlphRate = acyumMarketData?.orderBookPrice;
  const alphPerAcyumRate = acyumPerAlphRate ? 1 / acyumPerAlphRate : undefined;

  useEffect(() => {
    const inputNum = parseFloat(inputAmount);
    if (!isNaN(inputNum) && inputNum > 0 && acyumPerAlphRate !== undefined && alphPerAcyumRate !== undefined) {
      const calculatedOutput = isBuyingAcyum 
        ? inputNum * acyumPerAlphRate 
        : inputNum * alphPerAcyumRate;
      setOutputAmount(calculatedOutput.toFixed(isBuyingAcyum ? 2 : 4));
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
      await new Promise((resolve) => setTimeout(resolve, 1500)); 
      
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
                <CardTitle>Swap Tokens</CardTitle>
                <CardDescription>Exchange ALPH and ACYUM</CardDescription>
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
                        {acyumPerAlphRate !== undefined && alphPerAcyumRate !== undefined ? (
                            <>
                                <p>1 ALPH ≈ {acyumPerAlphRate.toFixed(2)} ACYUM</p>
                                <p>1 ACYUM ≈ {alphPerAcyumRate.toFixed(4)} ALPH</p>
                                {alphUsdPrice && <p>(1 ALPH ≈ ${alphUsdPrice.toFixed(3)} USD)</p>}
                            </>
                        ) : (
                            <p>Rate unavailable.</p>
                        )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                      disabled={isProcessing || !inputAmount || !outputAmount}
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

// Default export Server Component that renders the Client Component
export default function AcyumSwapPage() {
  return <AcyumSwapClient />;
}
