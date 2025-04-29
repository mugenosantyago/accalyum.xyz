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

export default function AcyumBankPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  
  const { 
    account,
    signer,
    connectionStatus,
  } = useWallet()

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected';
  
  const { balance, updateBalanceForTx } = useBalance();

  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  const displayBalance = formatAlphBalance(balance)

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address || !signer) {
      toast({ title: "Error", description: "Please connect wallet", variant: "destructive" })
      return
    }
    if (!depositAmount || Number.parseFloat(depositAmount) <= 0) {
      toast({ title: "Error", description: "Invalid amount", variant: "destructive" })
      return
    }
    setIsProcessing(true)
    try {
      logger.info(`Attempting deposit: ${depositAmount}...`);
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const fakeTxId = `placeholder_tx_${Date.now()}`;
      toast({ title: "Success (Placeholder)", description: `Deposit tx: ${fakeTxId}` })
      setDepositAmount("")
      if (updateBalanceForTx) {
         updateBalanceForTx(fakeTxId);
      } else {
         logger.warn("updateBalanceForTx not available from useBalance")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error"
      toast({ title: "Deposit Failed", description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
     e.preventDefault()
    if (!isConnected || !address || !signer) {
      toast({ title: "Error", description: "Please connect wallet", variant: "destructive" })
      return
    }
     if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      toast({ title: "Error", description: "Invalid amount", variant: "destructive" })
      return
    }
     setIsProcessing(true)
     try {
      logger.info(`Attempting withdrawal: ${withdrawAmount}...`);
      await new Promise((resolve) => setTimeout(resolve, 1500))
       const fakeTxId = `placeholder_tx_${Date.now()}`;
       toast({ title: "Success (Placeholder)", description: `Withdrawal tx: ${fakeTxId}` })
       setWithdrawAmount("")
       if (updateBalanceForTx) {
          updateBalanceForTx(fakeTxId);
       } else {
         logger.warn("updateBalanceForTx not available from useBalance")
       }
     } catch (error) {
       const message = error instanceof Error ? error.message : "Error"
       toast({ title: "Withdrawal Failed", description: message, variant: "destructive" })
     } finally {
       setIsProcessing(false)
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
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("balance")}</p>
                        <p className="text-xl font-bold">{displayBalance} ALPH</p>
                      </div>
                      <div className="mt-2">
                        <WalletStatusDisplay />
                      </div>
                    </div>

                    <Tabs defaultValue="deposit">
                      <TabsList className="grid grid-cols-2 mb-4">
                        <TabsTrigger value="deposit">{t("deposit")}</TabsTrigger>
                        <TabsTrigger value="withdraw">{t("withdraw")}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="deposit">
                        <form onSubmit={handleDeposit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="depositAmount">{t("amount")} (ALPH)</Label>
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
                            disabled={isProcessing || !isConnected || !signer}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}
                              </>
                            ) : (
                              <>
                                <ArrowDown className="mr-2 h-4 w-4" />
                                {t("deposit")}
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="withdraw">
                        <form onSubmit={handleWithdraw} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="withdrawAmount">{t("amount")} (ALPH)</Label>
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
                            disabled={isProcessing || !isConnected || !signer}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}
                              </>
                            ) : (
                              <>
                                <ArrowUp className="mr-2 h-4 w-4" />
                                {t("withdraw")}
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
