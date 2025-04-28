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
import { WalletStatusDisplay } from "@/components/wallet-status-display"
import { ConnectionSuccessModal } from "@/components/connection-success-modal"
import { checkAlephiumConnection } from "@/lib/wallet-utils"

export default function AcyumBankPage() {
  const { t } = useLanguage()
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [balance, setBalance] = useState("0")
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Alephium connection state
  const [alephiumConnection, setAlephiumConnection] = useState({
    isConnected: false,
    address: ""
  })

  // Force check connection when component mounts
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { connected, address } = await checkAlephiumConnection()
        if (connected && address) {
          console.log("Direct Alephium extension connection found:", address)
          setAlephiumConnection({
            isConnected: true,
            address
          })
        } else {
          setAlephiumConnection({
            isConnected: false,
            address: ""
          })
        }
      } catch (error) {
        console.error("Error checking Alephium extension:", error)
        setAlephiumConnection({
          isConnected: false,
          address: ""
        })
      }
    }
    
    checkConnection()
    
    // Also listen for Alephium's account changes
    const handleAccountsChanged = () => {
      console.log("Accounts changed, rechecking Alephium connection")
      checkConnection()
    }
    
    if (typeof window !== "undefined" && window.alephium && window.alephium.on) {
      try {
        window.alephium.on("accountsChanged", handleAccountsChanged)
      } catch (error) {
        console.error("Error setting up Alephium event listener:", error)
      }
    }
    
    return () => {
      if (typeof window !== "undefined" && window.alephium && window.alephium.off) {
        try {
          window.alephium.off("accountsChanged", handleAccountsChanged)
        } catch (error) {
          console.error("Error removing Alephium event listener:", error)
        }
      }
    }
  }, [])

  // Fetch balance when address changes
  useEffect(() => {
    async function fetchBalance() {
      if (alephiumConnection.isConnected && window.alephium) {
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
  }, [alephiumConnection])

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!alephiumConnection.isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!depositAmount || Number.parseFloat(depositAmount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsProcessing(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setDepositAmount("")
      alert("Deposit successful!")
    } catch (error) {
      console.error("Deposit error:", error)
      alert("Deposit failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!alephiumConnection.isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsProcessing(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setWithdrawAmount("")
      alert("Withdrawal successful!")
    } catch (error) {
      console.error("Withdrawal error:", error)
      alert("Withdrawal failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("acyumBank")}</h1>

          <ConnectionSuccessModal featureName="ACYUM Bank" />

          {/* Debug Panel */}
          <div className="max-w-md mx-auto mb-4 p-2 bg-gray-800 text-xs text-white rounded overflow-auto">
            <p>Connected: {String(alephiumConnection.isConnected)}</p>
            <p>Address: {alephiumConnection.address || "none"}</p>
          </div>

          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{t("acyumBanking")}</CardTitle>
                <CardDescription>{t("depositWithdrawSecurely")}</CardDescription>
              </CardHeader>

              <CardContent>
                {!alephiumConnection.isConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("pleaseConnectWallet")}</p>
                    <AlephiumConnectButton />
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 p-4 rounded-md mb-6">
                      <p className="text-sm text-gray-500">{t("yourWallet")}</p>
                      <p className="font-mono text-sm break-all">{alephiumConnection.address}</p>
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
                            disabled={isProcessing}
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
                            disabled={isProcessing}
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
