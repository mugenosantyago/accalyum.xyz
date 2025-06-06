"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletStatusDisplay } from "@/components/wallet-status-display"
import { useToast } from "@/components/ui/use-toast"
import { useWallet } from "@alephium/web3-react"
import { useBalance } from "@/components/balance-provider"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config"
import { BankLedger } from '@/components/bank-ledger'
import { EthereumProvider, useEthereum } from "@/components/ethereum-provider"
import { EthereumConnectButton } from "@/components/ethereum-connect-button"
import { ethers } from "ethers"

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

function YumFundClientInner() {
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
    isLoadingBalances,
    balanceError
  } = useBalance();

  // Ethereum wallet context
  const {
    signer: ethereumSigner,
    account: ethereumAccount,
    isConnected: isEthereumConnected,
    chainId,
    usdtBalance,
    isLoadingBalance: isLoadingUsdtBalance,
    refreshBalance: refreshUsdtBalance
  } = useEthereum();

  const [donateAmount, setDonateAmount] = useState("")
  const [donateTokenType, setDonateTokenType] = useState<"ALPH" | "USDT">("ALPH")
  const [isProcessingDonation, setIsProcessingDonation] = useState(false)

  const bankTreasuryAddress = config.treasury.communist;

  // Function to record transaction
  const recordDonation = async (token: 'ALPH' | 'USDT', amountInSmallestUnit: bigint, txId: string) => {
    logger.info(`Recording donation: ${formatBigIntAmount(amountInSmallestUnit, token === 'ALPH' ? 18 : config.ethereum.usdtDecimals)} ${token} with Tx ID ${txId}`);
    try {
        const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAddress: token === 'ALPH' ? address : ethereumAccount,
                token: token,
                amount: amountInSmallestUnit.toString(),
                txId: txId,
                type: 'donation',
            }),
      });
      if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Failed to record donation on backend: ${response.status}`, errorText);
            toast({
                title: "Donation Recorded (Backend Sync Warning)",
                description: `Your donation Tx ${txId} was submitted, but there was an issue recording it on the backend. The donation is on chain, but might not appear in your history immediately.`,
                variant: "default",
                duration: 10000
            });
        } else {
            logger.info('Donation successfully recorded on backend.');
        }
    } catch (error) {
        logger.error("Error recording donation on backend:", error);
        toast({
            title: "Donation Recorded (Backend Sync Warning)",
            description: `Your donation Tx ${txId} was submitted, but there was an issue recording it on the backend. The donation is on chain, but might not appear in your history immediately.`,
            variant: "default",
            duration: 10000
        });
    }
  };

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
           address: bankTreasuryAddress,
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

  const handleUsdtDonate = async () => {
    if (!isEthereumConnected || !ethereumAccount || !ethereumSigner) {
      toast({ title: "Ethereum Wallet Not Connected", description: "Please connect your Ethereum wallet first.", variant: "destructive" });
      return;
    }
    
    if (chainId !== config.ethereum.chainId) {
      toast({ title: "Wrong Network", description: "Please switch to Ethereum mainnet to donate USDT.", variant: "destructive" });
      return;
    }

    if (!config.ethereum.treasuryEthereumAddress) {
      toast({ title: "Configuration Error", description: "Treasury Ethereum address is not configured.", variant: "destructive" });
      return;
    }

    const amountNum = parseFloat(donateAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive USDT amount to donate.", variant: "destructive" });
      return;
    }
    setIsProcessingDonation(true);

    try {
      const amountInSmallestUnit = ethers.parseUnits(donateAmount, config.ethereum.usdtDecimals);

      logger.info(`Client: Signing USDT donation of ${donateAmount} to ${config.ethereum.treasuryEthereumAddress}`);

      // Create USDT contract instance
      const usdtContract = new ethers.Contract(
        config.ethereum.usdtContractAddress,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        ethereumSigner
      );

      // Execute USDT transfer
      const txResult = await usdtContract.transfer(
        config.ethereum.treasuryEthereumAddress,
        amountInSmallestUnit
      );

      logger.info(`Client: USDT Donation transaction sent: ${txResult.hash}`);
      
      // Wait for transaction confirmation
      await txResult.wait();

      logger.info(`Client: USDT Donation successful: Tx ID ${txResult.hash}`);

      recordDonation('USDT', amountInSmallestUnit, txResult.hash);

      toast({
        title: "Success",
        description: `USDT donation submitted (Tx: ${txResult.hash})`,
        variant: "default",
      });
      setDonateAmount("");
      
      // Refresh USDT balance
      setTimeout(() => refreshUsdtBalance(), 2000);

    } catch (error) {
      logger.error("Error submitting USDT donation transaction:", error);
      toast({
        title: "Donation Error",
        description: error instanceof Error ? error.message : "Failed to submit USDT donation",
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
    } else if (donateTokenType === 'USDT') {
      handleUsdtDonate();
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold text-center my-8">Donate to the YUM movement and mutual aid funding for indigenous communities</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Main Content Column */} 
             <div className="md:col-span-2 space-y-6">
                {/* User Wallet/Connection Card */}
                {!isConnected && !isEthereumConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("pleaseConnectWallet")}</p>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">For ALPH donations:</h3>
                        <WalletConnectDisplay />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">For USDT donations:</h3>
                        <EthereumConnectButton />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Wallet Info Card */}
                    <Card className="mb-6 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-gray-900 dark:text-white">{t("yourWallet")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Alephium Wallet */}
                          {isConnected && (
                            <div>
                              <CardDescription className="font-mono text-xs break-all text-gray-600 dark:text-gray-400 mb-2">
                                Alephium: {address}
                              </CardDescription>
                              {isLoadingBalances ? (
                                <div className="flex items-center text-gray-500 dark:text-gray-400">
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading ALPH balance...
                                </div>
                              ) : balanceError ? (
                                <div className="text-red-600 dark:text-red-500 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">
                                  Error loading ALPH balance: {balanceError}
                                </div>
                              ) : (
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
                              )}
                              <WalletStatusDisplay />
                            </div>
                          )}

                          {/* Ethereum Wallet */}
                          {isEthereumConnected && (
                            <div>
                              <CardDescription className="font-mono text-xs break-all text-gray-600 dark:text-gray-400 mb-2">
                                Ethereum: {ethereumAccount}
                              </CardDescription>
                              {isLoadingUsdtBalance ? (
                                <div className="flex items-center text-gray-500 dark:text-gray-400">
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading USDT balance...
                                </div>
                              ) : (
                                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">USDT Balance</p>
                                  <p className="text-xl font-bold text-gray-900 dark:text-white">{usdtBalance ?? '0'} USDT</p>
                                  {chainId !== config.ethereum.chainId && (
                                    <p className="text-xs text-amber-600 mt-1">⚠️ Wrong network - switch to Ethereum mainnet</p>
                                  )}
                                </div>
                              )}
                              <EthereumConnectButton />
                            </div>
                          )}

                          {/* Connection prompts */}
                          {!isConnected && (
                            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3">
                              <p className="text-sm mb-2">Connect Alephium wallet for ALPH donations:</p>
                              <WalletConnectDisplay />
                            </div>
                          )}
                          
                          {!isEthereumConnected && (
                            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3">
                              <p className="text-sm mb-2">Connect Ethereum wallet for USDT donations:</p>
                              <EthereumConnectButton />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Donation Tabs */} 
                     <Tabs defaultValue="ALPH" className="w-full">
                       <TabsList className="grid w-full grid-cols-2">
                         <TabsTrigger value="ALPH" onClick={() => setDonateTokenType('ALPH')}>ALPH</TabsTrigger>
                         <TabsTrigger value="USDT" onClick={() => setDonateTokenType('USDT')}>USDT</TabsTrigger>
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
                             {displayAlphBalance !== null && (
                                <p className="text-sm text-gray-400">Your balance: {displayAlphBalance} ALPH</p>
                             )}
                          </div>
                          <Button
                            type="submit"
                             className="w-full bg-green-600 hover:bg-green-700"
                             disabled={isProcessingDonation || !donateAmount || parseFloat(donateAmount) <= 0 || !isConnected}
                          >
                             {isProcessingDonation ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             ) : <ArrowUp className="mr-2 h-4 w-4" />}
                             Donate ALPH
                          </Button>
                        </form>
                      </TabsContent>
                       <TabsContent value="USDT">
                         <form onSubmit={handleDonateSubmit} className="space-y-4 mt-4">
                           <div className="space-y-2">
                             <Label htmlFor="usdtAmountDonate">USDT Amount to Donate</Label>
                             <Input
                               id="usdtAmountDonate"
                               type="number"
                               step="any"
                               min="0.01"
                               placeholder="10.0"
                               value={donateAmount}
                               onChange={(e) => setDonateAmount(e.target.value)}
                               required
                               className="bg-gray-800 border-gray-700 text-lg"
                             />
                             {usdtBalance !== null && (
                                 <p className="text-sm text-gray-400">Your balance: {usdtBalance} USDT</p>
                            )}
                         </div>
                           <Button
                             type="submit"
                             className="w-full bg-green-600 hover:bg-green-700"
                             disabled={isProcessingDonation || !donateAmount || parseFloat(donateAmount) <= 0 || !isEthereumConnected || chainId !== config.ethereum.chainId}
                           >
                             {isProcessingDonation ? (
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             ) : <ArrowUp className="mr-2 h-4 w-4" />}
                             Donate USDT
                           </Button>
                         </form>
                       </TabsContent>
                    </Tabs>

                    <div className="mt-8 text-center text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                      <p className="text-sm leading-relaxed">
                        {t("yumFundDescription")}
                      </p>
                    </div>
                  </>
                )}

                {/* Add Bank Ledger Component */}
                {(isConnected && address) && (
                   <BankLedger address={address} bankName="YUM Fund Donations" />
                )}
             </div>
          </div> 
        </main>
        <footer className="bg-gray-800 text-white text-center p-4">
          <p>&copy; {new Date().getFullYear()} YUM. All rights reserved.</p>
        </footer>
      </div>
    </ClientLayoutWrapper>
  )
}

export default function YumFundClient() {
  return (
    <EthereumProvider>
      <YumFundClientInner />
    </EthereumProvider>
  )
} 