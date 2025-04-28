"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { AlephiumConnectButton } from "@/components/alephium-connect-button"
import { WalletAwareWrapper } from "@/components/wallet-aware-wrapper"
import { useReliableWallet } from "@/hooks/use-reliable-wallet"
import { ConnectionSuccessModal } from "@/components/connection-success-modal"

export default function TradeTokensPage() {
  const { t } = useLanguage()
  const { isConnected, address, connect, checkConnection } = useReliableWallet()
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Add direct Alephium connection state
  const [directAlephiumConnection, setDirectAlephiumConnection] = useState({
    connected: false,
    address: ""
  })

  // Force check connection when component mounts
  useEffect(() => {
    if (checkConnection) {
      console.log("TradeTokensPage: Initial connection check")
      checkConnection()
    }
    
    // Add direct Alephium extension check
    const checkAlephiumExtension = async () => {
      if (typeof window !== "undefined" && window.alephium) {
        try {
          const isConnected = await window.alephium.isConnected()
          if (isConnected) {
            const address = await window.alephium.getSelectedAccount()
            if (address) {
              console.log("Direct Alephium extension connection found:", address)
              setDirectAlephiumConnection({
                connected: true,
                address
              })
            }
          }
        } catch (error) {
          console.error("Error checking Alephium extension:", error)
        }
      }
    }
    
    checkAlephiumExtension()
    
    // Also listen for Alephium's account changes
    const handleAccountsChanged = () => {
      console.log("Accounts changed, rechecking Alephium connection")
      checkAlephiumExtension()
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
  }, [checkConnection])
  
  // Get the effective connected state - either from hook or direct Alephium
  const effectiveIsConnected = isConnected || directAlephiumConnection.connected
  const effectiveAddress = address || directAlephiumConnection.address

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveIsConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!buyAmount || Number.parseFloat(buyAmount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsProcessing(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setBuyAmount("")
      alert("Purchase successful!")
    } catch (error) {
      console.error("Purchase error:", error)
      alert("Purchase failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveIsConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!sellAmount || Number.parseFloat(sellAmount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsProcessing(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setSellAmount("")
      alert("Sale successful!")
    } catch (error) {
      console.error("Sale error:", error)
      alert("Sale failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("tradeTokens")}</h1>

          <ConnectionSuccessModal featureName="Token Exchange" />
          
          {/* Debug Panel */}
          <div className="max-w-md mx-auto mb-4 p-2 bg-gray-800 text-xs text-white rounded overflow-auto">
            <p>Hook Connected: {String(isConnected)}</p>
            <p>Hook Address: {address || "none"}</p>
            <p>Direct Connected: {String(directAlephiumConnection.connected)}</p>
            <p>Direct Address: {directAlephiumConnection.address || "none"}</p>
            <p>Effective Connected: {String(effectiveIsConnected)}</p>
          </div>

          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{t("acyumTokenExchange")}</CardTitle>
                <CardDescription>{t("buyAndSell")}</CardDescription>
              </CardHeader>

              <CardContent>
                {!effectiveIsConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("accessTradingFeatures")}</p>
                    <AlephiumConnectButton />
                  </div>
                ) : (
                  <Tabs defaultValue="buy">
                    <TabsList className="grid grid-cols-2 mb-4">
                      <TabsTrigger value="buy">{t("buy")}</TabsTrigger>
                      <TabsTrigger value="sell">{t("sell")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="buy">
                      <form onSubmit={handleBuy} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="buyAmount">Amount (ALPH)</Label>
                          <Input
                            id="buyAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={buyAmount}
                            onChange={(e) => setBuyAmount(e.target.value)}
                            required
                          />
                        </div>

                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-500">{t("youWillReceive")}</p>
                          <p className="text-lg font-bold">
                            {buyAmount ? (Number.parseFloat(buyAmount) * 100).toFixed(2) : "0.00"} ACYUM
                          </p>
                          <p className="text-xs text-gray-500">{t("exchangeRate")}: 1 ALPH = 100 ACYUM</p>
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
                              <ArrowLeftRight className="mr-2 h-4 w-4" />
                              {t("buyAcyum")}
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="sell">
                      <form onSubmit={handleSell} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sellAmount">Amount (ACYUM)</Label>
                          <Input
                            id="sellAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={sellAmount}
                            onChange={(e) => setSellAmount(e.target.value)}
                            required
                          />
                        </div>

                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-500">{t("youWillReceive")}</p>
                          <p className="text-lg font-bold">
                            {sellAmount ? (Number.parseFloat(sellAmount) / 100).toFixed(4) : "0.00"} ALPH
                          </p>
                          <p className="text-xs text-gray-500">{t("exchangeRate")}: 100 ACYUM = 1 ALPH</p>
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
                              <ArrowLeftRight className="mr-2 h-4 w-4" />
                              {t("sellAcyum")}
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
}
