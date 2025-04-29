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
import { useWallet, useBalance, useAccount } from "@alephium/web3-react"
import { logger } from "@/lib/logger"
import { MakeDeposit, Withdraw } from "@/contracts/scripts"
import { config } from "@/lib/config"
import * as web3 from "@alephium/web3"
import { formatAmount } from "@alephium/web3"
import { transferAlph, transferToken, TokenFaucetInstance } from "@alephium/web3"

export default function AcyumBankPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  
  const { 
    account,
    signer,
    connectionStatus,
  } = useWallet()

  const { account: fullAccount } = useAccount()
  const address = fullAccount?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  
  const { balance: alphBalanceWei, updateBalanceForTx } = useBalance();
  const displayAlphBalance = web3.formatAmount(alphBalanceWei ?? 0n, 18, 4);

  const acyumTokenId = config.alephium.acyumTokenId;
  const acyumBalanceInfo = fullAccount?.tokenBalances?.find(token => token.id === acyumTokenId);
  const acyumBalance = acyumBalanceInfo?.amount ?? 0n;
  const displayAcyumBalance = formatAmount(acyumBalance, 7, 2);

  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [depositTokenType, setDepositTokenType] = useState<"ALPH" | "ACYUM">("ALPH")
  const [withdrawTokenType, setWithdrawTokenType] = useState<"ALPH" | "ACYUM">("ALPH")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFaucetProcessing, setIsFaucetProcessing] = useState(false)

  const bankTreasuryAddress = config.treasury.communist;
  const faucetContractAddress = config.treasury.communist;

  const handleAlphDeposit = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!bankTreasuryAddress) return toast({ title: "Error", description: "Bank treasury address not configured", variant: "destructive" });
    const depositAmountNum = Number.parseFloat(depositAmount);
    if (!depositAmount || depositAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    try {
      logger.info(`Attempting ALPH deposit of ${depositAmount} to ${bankTreasuryAddress}...`);
      const depositAmountAttoAlph = BigInt(Math.floor(depositAmountNum * Number(web3.ONE_ALPH)));
      
      const result = await transferAlph(signer, {
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
      
      const result = await transferToken(signer, {
         destinations: [{
           address: bankTreasuryAddress,
           tokenId: acyumTokenId,
           amount: depositAmountSmallestUnit
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
      const withdrawAmountAttoAlph = BigInt(Math.floor(withdrawAmountNum * Number(web3.ONE_ALPH)));
      
      const result = await Withdraw.execute(signer, {
        initialFields: {
          token: web3.ALPH_TOKEN_ID, 
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
        attoAlphAmount: web3.DUST_AMOUNT
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
                         </div>
                      </div>
                      <div className="mt-2">
                        <WalletStatusDisplay />
                      </div>
                    </div>

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
