"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { useWallet } from "@/hooks/use-wallet"
import { useToast } from "@/components/ui/use-toast"

export default function TradeTokensPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { 
    isConnected, 
    address, 
  } = useWallet()
  
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet first", variant: "destructive" })
      return
    }

    if (!buyAmount || Number.parseFloat(buyAmount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid purchase amount", variant: "destructive" })
      return
    }

    setIsProcessing(true)

    try {
      // TODO: Implement actual buy logic using wallet interaction
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate delay
      setBuyAmount("")
      toast({ title: "Success", description: "Purchase initiated successfully." })
    } catch (error) {
      console.error("Purchase error:", error)
      const message = error instanceof Error ? error.message : "Please try again."
      toast({ title: "Purchase Failed", description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet first", variant: "destructive" })
      return
    }

    if (!sellAmount || Number.parseFloat(sellAmount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid sell amount", variant: "destructive" })
      return
    }

    setIsProcessing(true)

    try {
      // TODO: Implement actual sell logic using wallet interaction
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate delay
      setSellAmount("")
      toast({ title: "Success", description: "Sale initiated successfully." })
    } catch (error) {
      console.error("Sale error:", error)
      const message = error instanceof Error ? error.message : "Please try again."
      toast({ title: "Sale Failed", description: message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("tradeTokens")}</h1>

          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{t("acyumTokenExchange")}</CardTitle>
                <CardDescription>{t("buyAndSell")}</CardDescription>
              </CardHeader>

              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("accessTradingFeatures")}</p>
                    <WalletConnectDisplay />
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
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={buyAmount}
                            onChange={(e) => setBuyAmount(e.target.value)}
                            required
                            className="bg-gray-800 border-gray-700"
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
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={sellAmount}
                            onChange={(e) => setSellAmount(e.target.value)}
                            required
                            className="bg-gray-800 border-gray-700"
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
