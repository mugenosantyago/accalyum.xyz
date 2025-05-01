"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
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
import { Types } from 'mongoose';
import { NodeProvider } from '@alephium/web3'
import { useBalance } from '@/components/balance-provider'
import { formatBalance } from '@/lib/utils'

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

interface FaucetSwapState {
  swapId: string | null;
  depositAddress: string | null;
  expectedAmountAlph: number | null;
  status: 'IDLE' | 'PENDING_DEPOSIT' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  depositTxId?: string | undefined;
  faucetTxId?: string | undefined;
  amountTargetToken: string | null;
  failureReason: string | null;
  lastChecked: number;
}

interface AddressBalanceResponse {
    address: string;
    balance: string; // ALPH balance
    tokenBalances?: TokenBalanceItem[];
    lockedBalance?: string;
    lockedTokenBalances?: TokenBalanceItem[];
    // Include other fields if known, like utxoNum
}

interface TokenBalanceItem {
    id: string;
    amount: string;
    // Potentially other fields like lockedAmount
}

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

  const {
    alphBalance: formattedAlphBalance,
    acyumBalance: formattedAcyumBalance,
    sweaBalance: formattedSweaBalance,
    alphUsdValue,
    acyumUsdValue,
    sweaUsdValue,
    isLoadingBalances,
    balanceError
  } = useBalance();

  const acyumTokenIdHexForAPI = config.alephium.acyumTokenIdHex;
  const acyumTokenId = config.alephium.acyumTokenIdHex;
  const ACYUM_DECIMALS = config.alephium.acyumDecimals;
  const sweaTokenId = config.alephium.sweaTokenIdHex;
  const SWEA_DECIMALS = config.alephium.sweaDecimals;

  const [rawAcyumMarketData, setRawAcyumMarketData] = useState<CandySwapTokenData | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  const fixedAlphPerAcyumRate = 0.7;
  const fixedAcyumPerAlphRate = 1 / fixedAlphPerAcyumRate;

  const [alphToSwapFaucet, setAlphToSwapFaucet] = useState("");
  const [targetFaucetToken, setTargetFaucetToken] = useState<'ACYUM' | 'sWEA'>('ACYUM');
  const [faucetSwapState, setFaucetSwapState] = useState<FaucetSwapState>({
    swapId: null,
    depositAddress: null,
    expectedAmountAlph: null,
    status: 'IDLE',
    depositTxId: undefined,
    faucetTxId: undefined,
    amountTargetToken: null,
    failureReason: null,
    lastChecked: 0
  });
  const [isFaucetSwapProcessing, setIsFaucetSwapProcessing] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchExternalData() { 
      setIsMarketDataLoading(true); 
      setMarketDataError(null); 
      setRawAcyumMarketData(null);

      try {
        const [tokenListRes, coingeckoRes] = await Promise.all([
          fetch('/api/candyswap/token-list'), 
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        if (!tokenListRes.ok) {
           const errorText = await tokenListRes.text();
           logger.error(`CandySwap API Error: ${tokenListRes.status}`, errorText);
           setMarketDataError(`CandySwap API error! status: ${tokenListRes.status}`); 
        } else {
            const tokenListData: CandySwapTokenData[] = await tokenListRes.json();
            const acyumData = tokenListData.find(token => token.id === acyumTokenIdHexForAPI); 
            if (acyumData) {
              setRawAcyumMarketData(acyumData);
              logger.info("Fetched ACYUM market metadata/volume for Swap page:", acyumData);
            } else {
              logger.warn(`ACYUM Token ID (${acyumTokenIdHexForAPI}) not found in CandySwap API response.`);
            }
        }

        if (!coingeckoRes.ok) {
           const errorText = await coingeckoRes.text();
           logger.error(`CoinGecko API Error: ${coingeckoRes.status}`, errorText);
           setMarketDataError(prev => prev ? `${prev} & CoinGecko API error! status: ${coingeckoRes.status}` : `CoinGecko API error! status: ${coingeckoRes.status}`);
        } else {
            const coingeckoData = await coingeckoRes.json();
            const price = coingeckoData?.alephium?.usd;
            if (typeof price === 'number') {
               logger.info(`Fetched ALPH/USD price for Swap page: ${price}`);
            } else {
               logger.error('Invalid data format from CoinGecko API', coingeckoData);
               setMarketDataError(prev => prev ? `${prev} & Invalid price data format from CoinGecko API` : 'Invalid price data format from CoinGecko API');
            }
        }
        
        logger.info(`Using FIXED rates for faucet info: ${fixedAcyumPerAlphRate.toFixed(2)} ACYUM/ALPH, ${fixedAlphPerAcyumRate.toFixed(1)} ALPH/ACYUM`);

      } catch (error) {
        logger.error("Failed to fetch external data for Swap page:", error);
        const message = error instanceof Error ? error.message : "Failed to load market data";
        setMarketDataError(prev => prev ? `${prev} & ${message}` : message);
      } finally {
        setIsMarketDataLoading(false);
      }
    };

    if (acyumTokenIdHexForAPI) {
       fetchExternalData();
    } else {
       setIsMarketDataLoading(false);
       setMarketDataError("ACYUM Token ID not configured.");
       logger.warn("ACYUM Token ID not configured, skipping external data fetch.");
       logger.info(`Using FIXED rates for faucet info: ${fixedAcyumPerAlphRate.toFixed(2)} ACYUM/ALPH, ${fixedAlphPerAcyumRate.toFixed(1)} ALPH/ACYUM`);
    }
  }, [acyumTokenIdHexForAPI]);

  const clearFaucetSwapState = useCallback(() => {
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    setPollingIntervalId(null);
    setFaucetSwapState({
        swapId: null,
        depositAddress: null,
        expectedAmountAlph: null,
        status: 'IDLE',
        depositTxId: undefined,
        faucetTxId: undefined,
        amountTargetToken: null,
        failureReason: null,
        lastChecked: 0
    });
    setAlphToSwapFaucet("");
  }, [pollingIntervalId]);

  const handlePollStatus = useCallback((swapId: string) => {
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
            if (response.status === 404) {
                logger.warn(`Swap ID ${swapId} not found during polling. Stopping polling.`);
                clearFaucetSwapState();
            } else {
                logger.error(`API error fetching status for ${swapId}: ${response.status}`);
            }
            return;
          }
          const statusResult: FaucetSwapState = await response.json();
          logger.debug(`Received status for ${swapId}:`, statusResult);
          setFaucetSwapState({
            ...statusResult,
            lastChecked: Date.now(),
            depositAddress: statusResult.depositAddress ?? faucetSwapState.depositAddress,
            expectedAmountAlph: statusResult.expectedAmountAlph ?? faucetSwapState.expectedAmountAlph,
          });
          if (statusResult.status === 'COMPLETE' || statusResult.status === 'FAILED') {
            logger.info(`Swap ${swapId} reached terminal state (${statusResult.status}). Stopping polling.`);
            if (pollingIntervalId) clearInterval(pollingIntervalId);
            setPollingIntervalId(null);
          }
        } catch (error) {
          logger.error(`Error during status polling for swap ${swapId}:`, error);
        }
      }, 5000);
      setPollingIntervalId(intervalId);
  }, [pollingIntervalId, clearFaucetSwapState, faucetSwapState.depositAddress, faucetSwapState.expectedAmountAlph]);

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
            depositTxId: undefined,
            faucetTxId: undefined,
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

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("tradeTokens")}</h1>

          {isConnected && address && (
            <Card>
              <CardHeader>
                <CardTitle>Your Wallet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Connected Address</p>
                  <p className="font-mono text-sm break-all mb-4">{address}</p>
                  {isLoadingBalances ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
                        <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading balances...</p>
                      </div>
                  ) : balanceError ? (
                     <Alert variant="destructive" className="mb-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Balance Error</AlertTitle>
                        <AlertDescription>{balanceError}</AlertDescription>
                      </Alert>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ALPH Balance</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedAlphBalance} ALPH</p>
                          {alphUsdValue && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">{alphUsdValue}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ACYUM Balance</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedAcyumBalance} ACYUM</p>
                          {acyumUsdValue && (
                             <p className="text-xs text-gray-400 dark:text-gray-500">{acyumUsdValue}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">sWEA Balance</p>
                           <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedSweaBalance} sWEA</p>
                           {sweaUsdValue && (
                             <p className="text-xs text-gray-400 dark:text-gray-500">{sweaUsdValue}</p>
                           )}
                        </div>
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Swap ALPH via Faucet</CardTitle>
              <CardDescription>
                Swap ALPH for ACYUM or sWEA using the secure deposit & faucet mechanism.
                (1 ALPH ≈ {fixedAcyumPerAlphRate.toFixed(2)} ACYUM, 1 ALPH = 1 sWEA)
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
                      min="0.000001"
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
                    <p>Successfully received {faucetSwapState.amountTargetToken ? `${formatBalance(faucetSwapState.amountTargetToken, targetFaucetToken === 'ACYUM' ? config.alephium.acyumDecimals : config.alephium.sweaDecimals)} ${targetFaucetToken}` : targetFaucetToken}.</p>
                    <p>Faucet Tx ID: <code className="block break-all bg-gray-700 p-1 rounded text-xs">{faucetSwapState.faucetTxId || 'N/A'}</code></p>
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
                    <p>Deposit Tx ID: <code className="text-xs bg-gray-700 p-1 rounded">{faucetSwapState.depositTxId || 'N/A'}</code></p>
                    <Button onClick={clearFaucetSwapState} variant="outline" size="sm" className="mt-3">
                      Try Again / Start New Swap
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null }
            </CardContent>
          </Card>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
} 