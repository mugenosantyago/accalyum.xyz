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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { Types } from 'mongoose'; // Likely already implicitly imported via SwapRequestStore if needed, but good to be explicit if used directly

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

// Interface for our faucet swap state
interface FaucetSwapState {
  swapId: string | null;
  depositAddress: string | null;
  expectedAmountAlph: number | null;
  status: 'IDLE' | 'PENDING_DEPOSIT' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  depositTxId?: string; // Add optional depositTxId
  faucetTxId: string | null;
  amountTargetToken: string | null; // Store as string from API
  failureReason: string | null;
  lastChecked: number; // Timestamp of last status check
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

  // Use the token ID for CandySwap API lookup
  const acyumTokenIdHexForAPI = config.alephium.acyumTokenIdHex; // Changed from acyumContractAddress
  const acyumTokenId = config.alephium.acyumTokenIdHex; // Keep hex ID if needed elsewhere
  const ACYUM_DECIMALS = config.alephium.acyumDecimals; // Use decimals from config
  const sweaTokenId = config.alephium.sweaTokenIdHex;
  const SWEA_DECIMALS = config.alephium.sweaDecimals;

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

  // --- State for ALPH -> Faucet Swap ---
  const [alphToSwapFaucet, setAlphToSwapFaucet] = useState("");
  const [targetFaucetToken, setTargetFaucetToken] = useState<'ACYUM' | 'sWEA'>('ACYUM');
  const [faucetSwapState, setFaucetSwapState] = useState<FaucetSwapState>({
    swapId: null,
    depositAddress: null,
    expectedAmountAlph: null,
    status: 'IDLE',
    faucetTxId: null,
    amountTargetToken: null,
    failureReason: null,
    lastChecked: 0
  });
  const [isFaucetSwapProcessing, setIsFaucetSwapProcessing] = useState(false); // For API call itself
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  // --- End Faucet Swap State ---

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
            // Find ACYUM using the token ID hex as the lookup key
            const acyumData = tokenListData.find(token => token.id === acyumTokenIdHexForAPI); 
            if (acyumData) {
              setRawAcyumMarketData(acyumData); // Store raw data for volume etc.
              logger.info("Fetched ACYUM market metadata/volume for Swap page:", acyumData);
              // No longer calculating rate from acyumData.orderBookPrice
            } else {
              logger.warn(`ACYUM Token ID (${acyumTokenIdHexForAPI}) not found in CandySwap API response.`);
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

    if (acyumTokenIdHexForAPI) { // Check if token ID is configured
       fetchExternalData();
    } else {
       setIsMarketDataLoading(false);
       setMarketDataError("ACYUM Token ID not configured."); // Updated error message
       logger.warn("ACYUM Token ID not configured, skipping external data fetch.");
       // Still log the fixed rates being used
       logger.info(`Using FIXED rates: ${fixedAcyumPerAlphRate.toFixed(2)} ACYUM/ALPH, ${fixedAlphPerAcyumRate.toFixed(1)} ALPH/ACYUM`);
    }
    // Dependency array uses token ID now
  }, [acyumTokenIdHexForAPI]);

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

  // --- Faucet Swap Logic ---

  // Define clearFaucetSwapState first
  const clearFaucetSwapState = useCallback(() => {
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    setPollingIntervalId(null);
    setFaucetSwapState({
        swapId: null,
        depositAddress: null,
        expectedAmountAlph: null,
        status: 'IDLE',
        faucetTxId: null,
        amountTargetToken: null,
        failureReason: null,
        lastChecked: 0
    });
    setAlphToSwapFaucet(""); // Reset input field
  }, [pollingIntervalId]);

  // Define handlePollStatus second
  const handlePollStatus = useCallback((swapId: string) => {
      // Clear any existing interval before starting a new one
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        logger.debug("Cleared previous polling interval.");
      }

      logger.info(`Starting status polling for swapId: ${swapId}`);

      const intervalId = setInterval(async () => {
        logger.debug(`Polling status for swap ${swapId}...`);
        try {
          const response = await fetch(`/api/swap/status/${swapId}`);
          if (!response.ok) {
            // If swap ID not found (404) after a short while, maybe stop polling?
            if (response.status === 404) {
                logger.warn(`Swap ID ${swapId} not found during polling. Stopping polling.`);
                clearFaucetSwapState(); // Clear state and interval
            } else {
                // Log other errors but continue polling for now
                logger.error(`API error fetching status for ${swapId}: ${response.status}`);
            }
            return; // Don't update state on error
          }

          const statusResult: FaucetSwapState = await response.json(); // Assuming API returns matching structure
          logger.debug(`Received status for ${swapId}:`, statusResult);

          // Update the entire state based on the API response
          setFaucetSwapState({
            ...statusResult, // Spread all fields from API
            lastChecked: Date.now(), // Update last checked time
            // Ensure local state values aren't overwritten if not in API response
            depositAddress: statusResult.depositAddress ?? faucetSwapState.depositAddress,
            expectedAmountAlph: statusResult.expectedAmountAlph ?? faucetSwapState.expectedAmountAlph,
          });

          // Stop polling if the swap is complete or failed
          if (statusResult.status === 'COMPLETE' || statusResult.status === 'FAILED') {
            logger.info(`Swap ${swapId} reached terminal state (${statusResult.status}). Stopping polling.`);
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Use the state variable ID
            setPollingIntervalId(null); // Clear the stored interval ID
          }

        } catch (error) {
          logger.error(`Error during status polling for swap ${swapId}:`, error);
          // Optionally stop polling after repeated errors, but for now continue
        }
      }, 5000); // Poll every 5 seconds

      // Store the new interval ID
      setPollingIntervalId(intervalId);

  }, [pollingIntervalId, clearFaucetSwapState, faucetSwapState.depositAddress, faucetSwapState.expectedAmountAlph]); // Include dependencies

  // Define handleInitiateFaucetSwap last
  const handleInitiateFaucetSwap = useCallback(async () => {
      if (!isConnected || !address) {
        toast({ title: "Wallet Not Connected", description: "Please connect your wallet first.", variant: "destructive" });
        return;
      }
      const amountNum = parseFloat(alphToSwapFaucet);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a positive ALPH amount to swap.", variant: "destructive" });
        return;
      }

      setIsFaucetSwapProcessing(true);
      setFaucetSwapState(prev => ({ ...prev, status: 'IDLE', failureReason: null }));
      logger.info(`Initiating faucet swap: ${amountNum} ALPH for ${targetFaucetToken} by ${address}`);

      try {
        const response = await fetch('/api/swap/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amountAlph: amountNum,
                targetToken: targetFaucetToken,
                userAddress: address,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            logger.error('Failed to initiate swap API call:', result);
            throw new Error(result.message || `API Error: ${response.status}`);
        }

        logger.info('Swap initiation successful:', result);
        toast({ title: "Swap Initiated", description: "Please follow the deposit instructions." });

        setFaucetSwapState({
            swapId: result.swapId,
            depositAddress: result.depositAddress,
            expectedAmountAlph: result.expectedAmountAlph,
            status: 'PENDING_DEPOSIT',
            faucetTxId: null,
            amountTargetToken: null,
            failureReason: null,
            lastChecked: Date.now()
        });

        handlePollStatus(result.swapId);

      } catch (error) {
        logger.error("Error initiating faucet swap:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: "Initiation Failed", description: message, variant: "destructive" });
        clearFaucetSwapState();
      } finally {
        setIsFaucetSwapProcessing(false);
      }
  }, [address, isConnected, alphToSwapFaucet, targetFaucetToken, toast, handlePollStatus, clearFaucetSwapState]);

  // Effect to clear interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  // --- End Faucet Swap Logic ---

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("tradeTokens")}</h1>

          {/* Use Tabs for different swap types */}
          <Tabs defaultValue="dex" className="max-w-md mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dex">Swap (DEX)</TabsTrigger>
              <TabsTrigger value="faucet">Swap ALPH (Faucet)</TabsTrigger>
            </TabsList>

            {/* DEX Swap Tab Content */}
            <TabsContent value="dex">
              <Card>
                <CardHeader>
                  {/* Keep original title or adjust */}
                  <CardTitle>ACYUM DEX Swap</CardTitle> 
                  <CardDescription>Trade ALPH & ACYUM via simulated DEX.</CardDescription>
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
                                    <p>1 ACYUM ≈ {alphPerAcyumRate.toFixed(1)} ALPH</p>
                                    {alphUsdPrice ? <p>(1 ALPH ≈ ${alphUsdPrice.toFixed(3)} USD)</p> : <p>(USD rate unavailable)</p>}
                                </> 
                            ) : (
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
                            "Swap (Simulated)"
                        )}
                        </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Faucet Swap Tab Content */}
            <TabsContent value="faucet">
               <Card>
                 <CardHeader>
                   <CardTitle>Swap ALPH via Faucet</CardTitle>
                   <CardDescription>
                     Swap ALPH for ACYUM or sWEA using the secure deposit & faucet mechanism.
                     (1 ALPH = 0.7 ACYUM, 1 ALPH = 1 sWEA)
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   {!isConnected ? (
                     <div className="text-center py-6">
                       <p className="mb-4 text-amber-600">{t("accessTradingFeatures")}</p>
                       <WalletConnectDisplay />
                     </div>
                   ) : faucetSwapState.status === 'IDLE' ? (
                     <form onSubmit={(e) => { e.preventDefault(); handleInitiateFaucetSwap(); }} className="space-y-4">
                       <div className="space-y-2">
                         <Label htmlFor="alphAmountFaucet">ALPH to Swap</Label>
                         <Input
                           id="alphAmountFaucet"
                           type="number"
                           step="any"
                           min="0.000001" // Minimum ALPH (consider dust)
                           placeholder="1.0"
                           value={alphToSwapFaucet}
                           onChange={(e) => setAlphToSwapFaucet(e.target.value)}
                           required
                           className="bg-gray-800 border-gray-700 text-lg"
                         />
                       </div>

                       <RadioGroup 
                         defaultValue="ACYUM" 
                         value={targetFaucetToken} 
                         onValueChange={(value: 'ACYUM' | 'sWEA') => setTargetFaucetToken(value)}
                         className="flex space-x-4 pt-2 pb-2"
                        >
                          <Label>Receive:</Label>
                           <div className="flex items-center space-x-2">
                             <RadioGroupItem value="ACYUM" id="r_acyum" />
                             <Label htmlFor="r_acyum">ACYUM</Label>
                           </div>
                           <div className="flex items-center space-x-2">
                             <RadioGroupItem value="sWEA" id="r_swea" />
                             <Label htmlFor="r_swea">sWEA</Label>
                           </div>
                         </RadioGroup>

                         <Button
                           type="submit"
                           className="w-full bg-blue-600 hover:bg-blue-700"
                           disabled={isFaucetSwapProcessing || !alphToSwapFaucet || parseFloat(alphToSwapFaucet) <= 0}
                         >
                           {isFaucetSwapProcessing ? (
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           ) : null}
                           Initiate Swap
                         </Button>
                     </form>
                   ) : faucetSwapState.status === 'PENDING_DEPOSIT' ? (
                     <Alert>
                       <Terminal className="h-4 w-4" />
                       <AlertTitle>Deposit Required</AlertTitle>
                       <AlertDescription className="space-y-2">
                         <p>Swap initiated (ID: <code className="text-xs bg-gray-700 p-1 rounded">{faucetSwapState.swapId}</code>).</p>
                         <p>Please send exactly <strong className="text-orange-400">{faucetSwapState.expectedAmountAlph} ALPH</strong> to the following address:</p>
                         <code className="block break-all bg-gray-700 p-2 rounded text-sm">
                           {faucetSwapState.depositAddress}
                         </code>
                         <p className="text-xs text-gray-400">The system will monitor for your deposit and automatically send {targetFaucetToken} to your wallet ({address?.substring(0, 6)}...).</p>
                         <Button onClick={clearFaucetSwapState} variant="outline" size="sm" className="mt-3">
                           Cancel / Start New Swap
                         </Button>
                       </AlertDescription>
                     </Alert>
                   ) : faucetSwapState.status === 'PROCESSING' ? (
                      <Alert variant="default">
                         <Loader2 className="h-4 w-4 animate-spin" />
                         <AlertTitle>Processing Deposit</AlertTitle>
                         <AlertDescription>
                           Deposit detected (Tx: {faucetSwapState.depositTxId?.substring(0,10)}...). 
                           Processing faucet transaction for {targetFaucetToken}. Please wait...
                           (Swap ID: <code className="text-xs bg-gray-700 p-1 rounded">{faucetSwapState.swapId}</code>)
                         </AlertDescription>
                      </Alert>
                   ) : faucetSwapState.status === 'COMPLETE' ? (
                      <Alert variant="default">
                         <Terminal className="h-4 w-4 text-green-500" />
                         <AlertTitle className="text-green-600">Swap Complete!</AlertTitle>
                         <AlertDescription className="space-y-2">
                            <p>Successfully received {faucetSwapState.amountTargetToken ? `${BigInt(faucetSwapState.amountTargetToken) / BigInt(10 ** (targetFaucetToken === 'ACYUM' ? ACYUM_DECIMALS : SWEA_DECIMALS))} ${targetFaucetToken}` : targetFaucetToken}.</p>
                            <p>Faucet Tx ID: <code className="block break-all bg-gray-700 p-1 rounded text-xs">{faucetSwapState.faucetTxId}</code></p>
                            <Button onClick={clearFaucetSwapState} variant="outline" size="sm" className="mt-3">
                              Start New Swap
                            </Button>
                         </AlertDescription>
                      </Alert>
                   ) : faucetSwapState.status === 'FAILED' ? (
                      <Alert variant="destructive">
                         <Terminal className="h-4 w-4" />
                         <AlertTitle>Swap Failed</AlertTitle>
                         <AlertDescription className="space-y-2">
                            <p>Reason: {faucetSwapState.failureReason || "An unknown error occurred."}</p>
                            <p>(Swap ID: <code className="text-xs bg-gray-700 p-1 rounded">{faucetSwapState.swapId}</code>)</p>
                             <Button onClick={clearFaucetSwapState} variant="outline" size="sm" className="mt-3">
                              Try Again / Start New Swap
                            </Button>
                         </AlertDescription>
                      </Alert>
                   ) : null }
                 </CardContent>
               </Card>
            </TabsContent>

          </Tabs>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
} 