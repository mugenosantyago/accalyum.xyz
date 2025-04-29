"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { formatAlphBalance } from "@/lib/alephium-utils"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletStatusDisplay } from "@/components/wallet-status-display"
import { useToast } from "@/components/ui/use-toast"
import { useWallet, useBalance } from "@alephium/web3-react"
import { logger } from "@/lib/logger"
import { MakeDeposit, Withdraw } from "@/contracts/scripts"
import { config } from "@/lib/config"
import { TokenFaucetInstance } from "@/artifacts/ts/TokenFaucet"
import type { Metadata } from 'next'

// Add metadata for the Acyum Bank page
// Note: Metadata must be defined outside the component function
export const metadata: Metadata = {
  title: 'Acyum Bank', // Uses template: "Acyum Bank | ACYUM"
  description: 'Deposit and withdraw ALPH and ACYUM tokens securely using the Acyum Bank feature on the Alephium network. Includes an ACYUM faucet.',
  keywords: ['Alephium', 'ACYUM', 'Bank', 'Deposit', 'Withdraw', 'Faucet', 'DeFi', 'Crypto'],
};

// Define constants manually as workaround for import issues
const ONE_ALPH = 10n ** 18n;
const ALPH_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";
const DUST_AMOUNT = 10000n;

// Define interface for the expected API response structure (subset)
interface CandySwapTokenData {
  id: string; // This seems to be an internal CandySwap ID, not the token ID
  collectionTicker: string; // This seems to be the actual Token ID / Contract Address
  name: string;
  slug: string;
  orderBookPrice?: number; // Price, usually against ALPH
  totalVolume?: number;
  dailyVolume?: number;
  // Add other fields as needed
}

function formatBigIntAmount(amount: bigint | undefined | null, decimals: number, displayDecimals: number = 4): string {
  const safeAmount = amount ?? 0n; 
  if (typeof safeAmount !== 'bigint') { 
      console.error("Invalid amount type passed to formatBigIntAmount:", amount);
      return "Error";
  }

  // Calculate factor using a loop instead of ** operator
  let factor = 1n;
  try {
    // Add check for excessively large decimals to prevent infinite loops/performance issues
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
  // const factor = 10n ** BigInt(decimals); // Original line causing error

  const integerPart = safeAmount / factor; 
  const fractionalPart = safeAmount % factor; 
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const displayFractional = fractionalString.slice(0, displayDecimals).replace(/0+$/, '');
  return `${integerPart}${displayFractional.length > 0 ? '.' + displayFractional : ''}`;
}

// Client Component containing the page logic
"use client"

function AcyumBankClient() {
  const { t } = useLanguage()
  const { toast } = useToast()
  
  const {
    signer,
    connectionStatus,
    account
  } = useWallet()

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  
  const { balance: alphBalanceWei, updateBalanceForTx } = useBalance();
  console.log('Formatting ALPH balance:', alphBalanceWei, typeof alphBalanceWei);
  const displayAlphBalance = formatBigIntAmount(alphBalanceWei ?? 0n, 18, 4);

  const acyumTokenId = config.alephium.acyumTokenId;
  const acyumBalanceInfo = account?.tokenBalances?.find((token: { id: string; amount: bigint }) => token.id === acyumTokenId);
  const acyumBalance = acyumBalanceInfo?.amount ?? 0n;
  console.log('Formatting ACYUM balance:', acyumBalance, typeof acyumBalance);
  const displayAcyumBalance = formatBigIntAmount(acyumBalance, 7, 2);

  // New state for CandySwap data & ALPH/USD price
  const [acyumMarketData, setAcyumMarketData] = useState<CandySwapTokenData | null>(null);
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [depositTokenType, setDepositTokenType] = useState<"ALPH" | "ACYUM">("ALPH")
  const [withdrawTokenType, setWithdrawTokenType] = useState<"ALPH" | "ACYUM">("ALPH")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFaucetProcessing, setIsFaucetProcessing] = useState(false)

  const bankTreasuryAddress = config.treasury.communist;
  const faucetContractAddress = config.treasury.communist;

  // Effect to fetch market data (CandySwap + CoinGecko)
  useEffect(() => {
    const fetchMarketData = async () => {
      setIsMarketDataLoading(true);
      setMarketDataError(null);
      setAcyumMarketData(null); // Reset previous data
      setAlphUsdPrice(null);    // Reset previous data

      try {
        // Fetch both APIs concurrently
        const [candySwapResponse, coingeckoResponse] = await Promise.all([
          fetch('https://candyswap.gg/api/token-list'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        // Process CandySwap data
        if (!candySwapResponse.ok) {
          throw new Error(`CandySwap API error! status: ${candySwapResponse.status}`);
        }
        const candySwapData: CandySwapTokenData[] = await candySwapResponse.json();
        const acyumData = candySwapData.find(token => token.collectionTicker === acyumTokenId);

        if (acyumData) {
          setAcyumMarketData(acyumData);
          logger.info("Fetched ACYUM market data from CandySwap:", acyumData);
        } else {
          logger.warn(`ACYUM token ID (${acyumTokenId}) not found in CandySwap API response.`);
          // Don't set a fatal error yet, CoinGecko might still succeed
        }

        // Process CoinGecko data
        if (!coingeckoResponse.ok) {
          throw new Error(`CoinGecko API error! status: ${coingeckoResponse.status}`);
        }
        const coingeckoData = await coingeckoResponse.json();
        const price = coingeckoData?.alephium?.usd;
        if (typeof price === 'number') {
          setAlphUsdPrice(price);
          logger.info(`Fetched ALPH/USD price from CoinGecko: ${price}`);
        } else {
           throw new Error('Invalid data format from CoinGecko API');
        }
        
        // If ACYUM wasn't found earlier, now set the error
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
  }, [acyumTokenId]); // Re-run if acyumTokenId changes

  // Calculate ACYUM/USD price
  const acyumUsdPrice = acyumMarketData?.orderBookPrice && alphUsdPrice
    ? acyumMarketData.orderBookPrice * alphUsdPrice
    : null;

  const handleAlphDeposit = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!bankTreasuryAddress) return toast({ title: "Error", description: "Bank treasury address not configured", variant: "destructive" });
    const depositAmountNum = Number.parseFloat(depositAmount);
    if (!depositAmount || depositAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    try {
      logger.info(`Attempting ALPH deposit of ${depositAmount} to ${bankTreasuryAddress}...`);
      const depositAmountAttoAlph = BigInt(Math.floor(depositAmountNum * Number(ONE_ALPH)));
      
      const result = await signer.signAndSubmitTransferTx({
        signerAddress: address,
        destinations: [{
          address: bankTreasuryAddress,
          attoAlphAmount: depositAmountAttoAlph
        }]
      });

      logger.info(`ALPH Deposit successful: Tx ID ${result.txId}`);
      toast({ title: "ALPH Deposit Submitted", description: `Tx ID: ${result.txId}` });
      setDepositAmount("");
    } catch (error) {
      logger.error("ALPH Deposit failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ALPH Deposit Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAcyumDeposit = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!bankTreasuryAddress) return toast({ title: "Error", description: "Bank treasury address not configured", variant: "destructive" });
    if (!acyumTokenId) return toast({ title: "Error", description: "ACYUM Token ID not configured", variant: "destructive" });
    const depositAmountNum = Number.parseFloat(depositAmount);
    if (!depositAmount || depositAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    logger.info(`Attempting ACYUM deposit of ${depositAmount} to ${bankTreasuryAddress}...`);
    try {
      const depositAmountSmallestUnit = BigInt(Math.floor(depositAmountNum * (10 ** 7)));
      
      const result = await signer.signAndSubmitTransferTx({
        signerAddress: address,
         destinations: [{
           address: bankTreasuryAddress,
           attoAlphAmount: DUST_AMOUNT,
           tokens: [{ id: acyumTokenId, amount: depositAmountSmallestUnit }]
         }]
      });

      logger.info(`ACYUM Deposit successful: Tx ID ${result.txId}`);
      toast({ title: "ACYUM Deposit Submitted", description: `Tx ID: ${result.txId}` });
      setDepositAmount("");
    } catch (error) {
      logger.error("ACYUM Deposit failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ACYUM Deposit Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAlphWithdraw = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    const withdrawAmountNum = Number.parseFloat(withdrawAmount);
    if (!withdrawAmount || withdrawAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    try {
      logger.info(`Attempting ALPH withdrawal of ${withdrawAmount}...`);
      const withdrawAmountAttoAlph = BigInt(Math.floor(withdrawAmountNum * Number(ONE_ALPH)));
      
      const result = await Withdraw.execute(signer, {
        initialFields: {
          token: ALPH_TOKEN_ID,
          amount: withdrawAmountAttoAlph
        },
      });
      logger.info(`ALPH Withdrawal successful: Tx ID ${result.txId}`);
      toast({ title: "ALPH Withdrawal Submitted", description: `Tx ID: ${result.txId}` });
      setWithdrawAmount("");
    } catch (error) {
      logger.error("ALPH Withdrawal failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ALPH Withdrawal Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAcyumWithdraw = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!acyumTokenId) return toast({ title: "Error", description: "ACYUM Token ID not configured", variant: "destructive" });
    const withdrawAmountNum = Number.parseFloat(withdrawAmount);
    if (!withdrawAmount || withdrawAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    try {
      logger.info(`Attempting ACYUM withdrawal of ${withdrawAmount}...`);
      const withdrawAmountSmallestUnit = BigInt(Math.floor(withdrawAmountNum * (10 ** 7)));
      
      const result = await Withdraw.execute(signer, {
        initialFields: {
          token: acyumTokenId,
          amount: withdrawAmountSmallestUnit
        },
      });

      logger.info(`ACYUM Withdrawal successful: Tx ID ${result.txId}`);
      toast({ title: "ACYUM Withdrawal Submitted", description: `Tx ID: ${result.txId}` });
      setWithdrawAmount("");
    } catch (error) {
      logger.error("ACYUM Withdrawal failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ACYUM Withdrawal Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositTokenType === 'ALPH') {
      handleAlphDeposit();
    } else {
      handleAcyumDeposit();
    }
  }

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawTokenType === 'ALPH') {
      handleAlphWithdraw();
    } else {
      handleAcyumWithdraw();
    }
  }

  const handleFaucet = async () => {
    if (!isConnected || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!acyumTokenId) return toast({ title: "Error", description: "ACYUM Token ID not configured", variant: "destructive" });
    if (!faucetContractAddress) return toast({ title: "Error", description: "Faucet address not configured", variant: "destructive" });

    setIsFaucetProcessing(true);
    logger.info("Attempting to use ACYUM faucet...");
    try {
      const faucet = new TokenFaucetInstance(faucetContractAddress);
      const amountToClaim = BigInt(7 * (10 ** 7));

      const result = await faucet.transact.withdraw({
        signer: signer,
        args: { amount: amountToClaim },
        attoAlphAmount: DUST_AMOUNT
      });

      logger.info(`Faucet claim successful: Tx ID ${result.txId}`);
      toast({ title: "Faucet Claim Submitted", description: `Tx ID: ${result.txId}` });
    } catch (error) {
      logger.error("Faucet failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Faucet Failed", description: message, variant: "destructive" });
    } finally {
      setIsFaucetProcessing(false);
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("acyumBank")}</h1>
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{t("acyumBanking")}</CardTitle>
                <CardDescription>{t("depositWithdrawSecurely")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("pleaseConnectWallet")}</p>
                    <WalletConnectDisplay />
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("yourWallet")}</p>
                      <p className="font-mono text-sm break-all">{address}</p>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                         <div>
                           <p className="text-sm text-gray-500 dark:text-gray-400">ALPH {t("balance")}</p>
                           <p className="text-xl font-bold">{displayAlphBalance} ALPH</p>
                         </div>
                         <div>
                           <p className="text-sm text-gray-500 dark:text-gray-400">ACYUM {t("balance")}</p>
                           <p className="text-xl font-bold">{displayAcyumBalance} ACYUM</p>
                           {/* Display CandySwap/CoinGecko Market Data */}
                           {isMarketDataLoading ? (
                             <p className="text-xs text-gray-400">Loading market price...</p>
                           ) : marketDataError ? (
                             <p className="text-xs text-red-500">Error: {marketDataError}</p>
                           ) : acyumMarketData?.orderBookPrice !== undefined && alphUsdPrice !== null ? (
                             <>
                               <p className="text-xs text-gray-400">
                                 ≈ {(Number(displayAcyumBalance.replace(/,/g, '')) * acyumMarketData.orderBookPrice).toFixed(2)} ALPH 
                                 (@ {acyumMarketData.orderBookPrice.toPrecision(3)} ALPH/ACYUM)
                               </p>
                               {acyumUsdPrice !== null && (
                                <p className="text-xs text-gray-400">
                                  ≈ ${(Number(displayAcyumBalance.replace(/,/g, '')) * acyumUsdPrice).toFixed(2)} USD 
                                  (@ ${acyumUsdPrice.toFixed(4)} / ACYUM)
                                </p>
                               )}
                             </>
                           ) : (
                             <p className="text-xs text-gray-400">Market price unavailable.</p>
                           )}
                         </div>
                      </div>
                      <div className="mt-2">
                        <WalletStatusDisplay />
                      </div>
                    </div>

                    {/* ACYUM Faucet Card - This stays here */}
                    <Card className="mb-6 bg-gray-850 border-gray-700">
                      <CardHeader className="pb-2">
                         <CardTitle className="text-lg">ACYUM Faucet</CardTitle>
                         <CardDescription>Get 7 free ACYUM tokens daily.</CardDescription>
                      </CardHeader>
                      <CardContent>
                         <Button 
                           onClick={handleFaucet} 
                           disabled={isFaucetProcessing}
                           className="w-full bg-blue-600 hover:bg-blue-700"
                         >
                           {isFaucetProcessing ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           ) : null}
                           Claim 7 ACYUM
                         </Button>
                      </CardContent>
                    </Card>

                    {/* Display Market Info Card */}
                    {!isMarketDataLoading && !marketDataError && (acyumMarketData || alphUsdPrice) && (
                      <Card className="mb-6 bg-gray-850 border-gray-700">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-lg">Market Info</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 text-sm">
                           {acyumMarketData && (
                             <>
                               <p>ACYUM/ALPH Price:</p> 
                               <p className="text-right">{acyumMarketData.orderBookPrice?.toPrecision(4) ?? 'N/A'}</p>
                             </>
                           )}
                           {acyumUsdPrice !== null && (
                            <>
                              <p>ACYUM/USD Price:</p> 
                              <p className="text-right">${acyumUsdPrice.toFixed(4)}</p>
                            </>
                           )}
                           {alphUsdPrice !== null && (
                            <>
                              <p>ALPH/USD Price:</p> 
                              <p className="text-right">${alphUsdPrice.toFixed(4)}</p>
                            </>
                           )}
                           {acyumMarketData && (
                             <>
                               <p>Total Volume (ACYUM):</p> 
                               <p className="text-right">{acyumMarketData.totalVolume?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
                               <p>24h Volume (ACYUM):</p> 
                               <p className="text-right">{acyumMarketData.dailyVolume?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
                             </>
                           )}
                           <p className="text-xs col-span-2 text-gray-400 pt-2">
                             {acyumMarketData && (
                               <>Data from <a href={`https://candyswap.gg/token/${acyumMarketData.slug}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">CandySwap</a> {alphUsdPrice && "&"} </> 
                             )}
                             {alphUsdPrice && (
                              <> <a href="https://www.coingecko.com/en/coins/alephium" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">CoinGecko</a></>
                             )}
                           </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Deposit/Withdraw Tabs - This starts here */}
                    <Tabs defaultValue="deposit">
                      <TabsList className="grid grid-cols-2 mb-4">
                        <TabsTrigger value="deposit">{t("deposit")}</TabsTrigger>
                        <TabsTrigger value="withdraw">{t("withdraw")}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="deposit">
                        <form onSubmit={handleDepositSubmit} className="space-y-4">
                          <div className="flex space-x-4 mb-2">
                             <Label>Token:</Label>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="deposit_alph" name="deposit_token" value="ALPH" checked={depositTokenType === 'ALPH'} onChange={() => setDepositTokenType('ALPH')} />
                               <Label htmlFor="deposit_alph">ALPH</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="deposit_acyum" name="deposit_token" value="ACYUM" checked={depositTokenType === 'ACYUM'} onChange={() => setDepositTokenType('ACYUM')} disabled={!acyumTokenId} />
                               <Label htmlFor="deposit_acyum" className={!acyumTokenId ? 'text-gray-500' : ''}>ACYUM</Label>
                             </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="depositAmount">{t("amount")} ({depositTokenType})</Label>
                            <Input
                              id="depositAmount"
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              required
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                            disabled={isProcessing || !isConnected || !signer || (depositTokenType === 'ACYUM' && !acyumTokenId)}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}
                              </>
                            ) : (
                              <>
                                <ArrowDown className="mr-2 h-4 w-4" />
                                {t("deposit")} {depositTokenType}
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="withdraw">
                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                          <div className="flex space-x-4 mb-2">
                             <Label>Token:</Label>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="withdraw_alph" name="withdraw_token" value="ALPH" checked={withdrawTokenType === 'ALPH'} onChange={() => setWithdrawTokenType('ALPH')} />
                               <Label htmlFor="withdraw_alph">ALPH</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="withdraw_acyum" name="withdraw_token" value="ACYUM" checked={withdrawTokenType === 'ACYUM'} onChange={() => setWithdrawTokenType('ACYUM')} disabled={!acyumTokenId} />
                               <Label htmlFor="withdraw_acyum" className={!acyumTokenId ? 'text-gray-500' : ''}>ACYUM</Label>
                             </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="withdrawAmount">{t("amount")} ({withdrawTokenType})</Label>
                            <Input
                              id="withdrawAmount"
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                              required
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                            disabled={isProcessing || !isConnected || !signer || (withdrawTokenType === 'ACYUM' && !acyumTokenId)}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}
                              </>
                            ) : (
                              <>
                                <ArrowUp className="mr-2 h-4 w-4" />
                                {t("withdraw")} {withdrawTokenType}
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </>
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
export default function AcyumBankPage() {
  return <AcyumBankClient />;
}
