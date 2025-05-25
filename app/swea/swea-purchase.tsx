"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Info } from "lucide-react"
import { useWallet, useBalance as useAlphBalanceHook } from "@alephium/web3-react"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { useToast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config" 
import Image from 'next/image'
import { useLanguage } from "@/components/language-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { NodeProvider } from '@alephium/web3'
import { useBalance } from '@/components/balance-provider'
import { formatBalance } from '@/lib/utils'
import type { Proposal } from '@/lib/types/proposal'
import ReactMarkdown from 'react-markdown'

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

// Local formatter for atto ALPH
function formatAttoAlph(amount: string | undefined): string {
  if (amount === undefined) return '0.00';
  try {
    const amountBigInt = BigInt(amount);
    const oneAlph = 10n ** 18n;
    const integerPart = amountBigInt / oneAlph;
    const fractionalPart = amountBigInt % oneAlph;
    const formattedInteger = integerPart.toLocaleString('en-US');
    const formattedFractional = fractionalPart.toString().padStart(18, '0').substring(0, 4);
    return `${formattedInteger}.${formattedFractional}`;
  } catch (e) {
    logger.error("Error formatting atto ALPH:", e);
    return '0.00';
  }
}

// Interface for address balance response (simplified)
interface AddressBalanceResponse {
    balance: string; // ALPH balance
    tokenBalances?: { id: string; amount: string }[];
}

// Interface for our faucet swap state (copied from acyum-swap)
interface FaucetSwapState {
  swapId: string | null;
  depositAddress: string | null;
  expectedAmountAlph: number | null;
  status: 'IDLE' | 'PENDING_INITIATE' | 'PENDING_DEPOSIT' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  depositTxId?: string;
  faucetTxId?: string;
  amountTargetToken: string | null; // Stored as string from backend (BigInt)
  failureReason: string | null;
  lastChecked: number; // Timestamp of last status check
}

export default function SweaSwapClient() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { 
    account, 
    connectionStatus,
  } = useWallet()
  
  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  
  // Config values
  const sweaTokenId = config.alephium.sweaTokenIdHex;
  const SWEA_DECIMALS = config.alephium.sweaDecimals;
  const providerUrl = config.alephium.providerUrl;

  // --- State for Wallet Balances ---
  const {
    alphBalance: formattedAlphBalance,
    sweaBalance: formattedSweaBalance,
    alphUsdValue,
    sweaUsdValue,
    isLoadingBalances,
    balanceError
  } = useBalance();

  // --- State for ALPH -> sWEA Faucet Swap ---
  const [alphToSwapFaucet, setAlphToSwapFaucet] = useState("");
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
  // --- End Faucet Swap State ---

  // State for Live Proposals
  const [liveProposals, setLiveProposals] = useState<Proposal[]>([])
  const [isLoadingLiveProposals, setIsLoadingLiveProposals] = useState(true)
  const [liveProposalsError, setLiveProposalsError] = useState<string | null>(null)

  // --- Fetch User Token Balance (sWEA) ---
  useEffect(() => {
    const fetchSweaBalance = async () => {
      if (!address || !sweaTokenId || !providerUrl) return;

      logger.debug(`Fetching sWEA balance for ${address}`);

      try {
        const nodeProvider = new NodeProvider(providerUrl);
        const balanceResult = await nodeProvider.addresses.getAddressesAddressBalance(address) as AddressBalanceResponse;
        const sweaInfo = balanceResult.tokenBalances?.find(token => token.id === sweaTokenId);
        
        if (sweaInfo) {
            setFaucetSwapState({
                ...faucetSwapState,
                amountTargetToken: sweaInfo.amount
            });
            logger.info(`sWEA balance for ${address}: ${sweaInfo.amount}`);
        } else {
            setFaucetSwapState({
                ...faucetSwapState,
                amountTargetToken: '0'
            });
            logger.info(`sWEA balance for ${address}: 0 (token not found in balances)`);
        }
      } catch (error) {
        logger.error(`Failed to fetch sWEA balance for ${address}:`, error);
        setFaucetSwapState({
            ...faucetSwapState,
            failureReason: error instanceof Error ? error.message : "An unknown error occurred."
        });
      }
    };

    if (isConnected && address) {
      fetchSweaBalance();
    }
    // Refetch if address or token ID changes (though token ID is constant here)
  }, [isConnected, address, sweaTokenId, providerUrl]); 
  // --- End Token Balance Fetch ---

  // --- Fetch Live Proposals Effect ---
  useEffect(() => {
    const fetchLiveProposals = async () => {
      setIsLoadingLiveProposals(true);
      setLiveProposalsError(null);
      try {
        const response = await fetch('/api/proposals/live');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch live proposals: ${response.statusText}`);
        }
        const data = await response.json();
        setLiveProposals(Array.isArray(data?.proposals) ? data.proposals : []);
        logger.info(`Fetched ${data.proposals?.length || 0} live proposals.`);
      } catch (error) {
        logger.error("Error fetching live proposals:", error);
        const message = error instanceof Error ? error.message : "Could not load live proposals.";
        setLiveProposalsError(message);
        setLiveProposals([]);
      } finally {
        setIsLoadingLiveProposals(false);
      }
    };

    fetchLiveProposals();
  }, []); // Empty dependency array means this runs once on mount

  // --- End Fetch Live Proposals Effect ---

  // --- Faucet Swap Logic (Adapted) ---
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
            depositTxId: statusResult.depositTxId ?? undefined,
            faucetTxId: statusResult.faucetTxId ?? undefined,
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
      logger.info(`Initiating sWEA faucet swap: ${amountNum} ALPH by ${address}`);

      try {
        const response = await fetch('/api/swap/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amountAlph: amountNum,
                targetToken: 'sWEA', // Hardcoded to sWEA
                userAddress: address,
            }),
        });
        const result = await response.json();
        if (!response.ok) {
            logger.error('Failed to initiate sWEA swap API call:', result);
            throw new Error(result.message || `API Error: ${response.status}`);
        }
        logger.info('sWEA swap initiation successful:', result);
        toast({ title: "Swap Initiated", description: "Please follow the ALPH deposit instructions." });
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
        logger.error("Error initiating sWEA faucet swap:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: "Initiation Failed", description: message, variant: "destructive" });
        clearFaucetSwapState();
      } finally {
        setIsFaucetSwapProcessing(false);
      }
  }, [address, isConnected, alphToSwapFaucet, toast, handlePollStatus, clearFaucetSwapState]);

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);
  // --- End Faucet Swap Logic ---

  // --- Format Balances ---
  // Remove old formatting logic - now handled by hook
  // const displayAlphBalance = formatAttoAlph(alphRawBalance);
  // const displaySweaBalance = sweaBalance !== null 
  //   ? (Number(sweaBalance) / (10 ** SWEA_DECIMALS)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: SWEA_DECIMALS })
  //   : '...';
  // --- End Format Balances ---

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">sWEA Swap</h1>

          {/* Display Live Proposals */}
          {isLoadingLiveProposals ? (
            <div className="text-center text-gray-500 mb-8"><Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> Loading proposals...</div>
          ) : liveProposalsError ? (
            <div className="text-red-500 text-center mb-8">Error loading proposals: {liveProposalsError}</div>
          ) : liveProposals.length > 0 ? (
            <div className="mb-8 space-y-6">
              <h2 className="text-2xl font-semibold text-center">Latest Proposals</h2>
              {liveProposals.map(proposal => (
                <Card key={proposal._id} className="bg-gray-850 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-xl">{proposal.title}</CardTitle>
                    {proposal.publishedAt && (
                      <CardDescription className="text-sm text-gray-400">Published: {new Date(proposal.publishedAt).toLocaleString()}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="prose prose-invert max-w-none">{/* Use prose for markdown styling */}
                     <ReactMarkdown>{proposal.content}</ReactMarkdown>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <div className="max-w-md mx-auto space-y-6">
            {/* Wallet Info Card - Display ALPH and sWEA */}
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ALPH Balance</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedAlphBalance} ALPH</p>
                          {alphUsdValue && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">{alphUsdValue}</p>
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

            {/* Faucet Swap Card - Specific to sWEA */}
            <Card>
              <CardHeader>
                <CardTitle>Swap ALPH for sWEA</CardTitle>
                <CardDescription>
                  Use the secure deposit & faucet mechanism. (1 ALPH = 1 sWEA)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">Connect wallet to swap</p>
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
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={isFaucetSwapProcessing || !alphToSwapFaucet || parseFloat(alphToSwapFaucet) <= 0}
                    >
                      {isFaucetSwapProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Initiate sWEA Swap
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
                      <p className="text-xs text-gray-400">The system will automatically send sWEA to your wallet ({address?.substring(0, 6)}...).</p>
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
                      Processing sWEA faucet transaction. Please wait...
                      (Swap ID: <code className="text-xs bg-gray-700 p-1 rounded">{faucetSwapState.swapId}</code>)
                    </AlertDescription>
                  </Alert>
                ) : faucetSwapState.status === 'COMPLETE' ? (
                  <Alert variant="default">
                    <Terminal className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-600">Swap Complete!</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>Successfully received {faucetSwapState.amountTargetToken ? `${formatBigIntAmount(BigInt(faucetSwapState.amountTargetToken), SWEA_DECIMALS)} sWEA` : 'sWEA'}.</p>
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
          </div>
        </main>
      </div>
    </>
  )
} 