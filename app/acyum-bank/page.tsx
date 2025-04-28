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
import { AlephiumConnectButton } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletAwareWrapper } from "@/components/wallet-aware-wrapper"
import { useWalletTransactions } from "@/hooks/use-wallet-transactions"
import { WalletStatusDisplay } from "@/components/wallet-status-display"
import { ConnectionSuccessModal } from "@/components/connection-success-modal"

export default function AcyumBankPage() {
  const { t } = useLanguage()
  const { isConnected, address, isProcessing, deposit, withdraw, checkConnection } = useWalletTransactions()
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [balance, setBalance] = useState("0")
  const [isLocalProcessing, setIsLocalProcessing] = useState(false)

  // Force check connection when component mounts
  useEffect(() => {
    console.log("AcyumBankPage: Initial connection check")
    checkConnection()
  }, [checkConnection])

  // Fetch balance when address changes
  useEffect(() => {
    async function fetchBalance() {
      if (address && window.alephium) {
        try {
          const balanceResult = await window.alephium.getBalance()
          if (balanceResult && balanceResult.balance) {
            setBalance(balanceResult.balance)
          }
        } catch (error) {
          console.error("Error fetching balance:", error)
        }
      }
    }

    fetchBalance()
  }, [address])

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!depositAmount || Number.parseFloat(depositAmount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsLocalProcessing(true)

    try {
      await deposit(depositAmount)
      setDepositAmount("")
    } catch (error) {
      console.error("Deposit error:", error)
    } finally {
      setIsLocalProcessing(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsLocalProcessing(true)

    try {
      await withdraw(withdrawAmount)
      setWithdrawAmount("")
    } catch (error) {
      console.error("Withdrawal error:", error)
    } finally {
      setIsLocalProcessing(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("acyumBank")}</h1>

          <ConnectionSuccessModal featureName="ACYUM Bank" />

          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{t("acyumBanking")}</CardTitle>
                <CardDescription>{t("depositWithdrawSecurely")}</CardDescription>
              </CardHeader>

              <CardContent>
                <WalletAwareWrapper
                  fallback={
                    <div className="text-center py-6">
                      <p className="mb-4 text-amber-600">{t("pleaseConnectWallet")}</p>
                      <AlephiumConnectButton />
                    </div>
                  }
                >
                  {({ isConnected, address }) =>
                    isConnected && address ? (
                      <>
                        <div className="bg-gray-50 p-4 rounded-md mb-6">
                          <p className="text-sm text-gray-500">{t("yourWallet")}</p>
                          <p className="font-mono text-sm break-all">{address}</p>
                          <div className="mt-2">
                            <p className="text-sm text-gray-500">{t("balance")}</p>
                            <p className="text-xl font-bold">{formatAlphBalance(balance || "0")} ALPH</p>
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
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={depositAmount}
                                  onChange={(e) => setDepositAmount(e.target.value)}
                                  required
                                />
                              </div>

                              <Button
                                type="submit"
                                className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                                disabled={isProcessing || isLocalProcessing}
                              >
                                {isProcessing || isLocalProcessing ? (
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
                                <Label htmlFor="withdrawAmount">{t("amount")} (ACYUM)</Label>
                                <Input
                                  id="withdrawAmount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={withdrawAmount}
                                  onChange={(e) => setWithdrawAmount(e.target.value)}
                                  required
                                />
                              </div>

                              <Button
                                type="submit"
                                className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                                disabled={isProcessing || isLocalProcessing}
                              >
                                {isProcessing || isLocalProcessing ? (
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
                    ) : null
                  }
                </WalletAwareWrapper>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
}
