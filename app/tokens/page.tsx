"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { formatAlphBalance, formatAcyumBalance } from "@/lib/alephium-utils"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { checkAlephiumConnection } from "@/lib/wallet-utils"

interface TokenBalance {
  symbol: string
  name: string
  balance: string
  value: string
}

export default function TokensPage() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [tokens, setTokens] = useState<TokenBalance[]>([])

  // Alephium connection state
  const [alephiumConnection, setAlephiumConnection] = useState({
    isConnected: false,
    address: ""
  })
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  // Check direct connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsCheckingConnection(true)
      try {
        const { connected, address } = await checkAlephiumConnection()
        console.log("Tokens page - Direct connection check result:", connected, address)
        setAlephiumConnection({
          isConnected: connected,
          address: address || ""
        })
      } catch (error) {
        console.error("Error checking direct connection:", error)
        setAlephiumConnection({
          isConnected: false,
          address: ""
        })
      } finally {
        setIsCheckingConnection(false)
      }
    }

    checkConnection()

    // Set up periodic checks and event listeners
    const intervalId = setInterval(checkConnection, 5000)
    
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
      clearInterval(intervalId)
      if (typeof window !== "undefined" && window.alephium && window.alephium.off) {
        try {
          window.alephium.off("accountsChanged", handleAccountsChanged)
        } catch (error) {
          console.error("Error removing Alephium event listener:", error)
        }
      }
    }
  }, [])

  useEffect(() => {
    const fetchTokens = async () => {
      // Only fetch if we have an address
      if (!alephiumConnection.address) {
        setIsLoading(false)
        return
      }

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Mock data
        setTokens([
          {
            symbol: "ACYUM",
            name: "American Communist Youth Uprising Movement",
            balance: "1000.00",
            value: "10.00",
          },
          {
            symbol: "ALPH",
            name: "Alephium",
            balance: "25.50",
            value: "25.50",
          },
        ])
      } catch (error) {
        console.error("Error fetching tokens:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokens()
  }, [alephiumConnection.address])

  // Debug information
  console.log("Rendering TokensPage with state:", {
    alephiumConnection,
    isCheckingConnection,
  })

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("yourTokens")}</h1>

          <Card>
            <CardHeader>
              <CardTitle>{t("tokenBalances")}</CardTitle>
              <CardDescription>{t("viewAllTokens")}</CardDescription>
            </CardHeader>

            <CardContent>
              {/* Debug information */}
              <div className="mb-4 p-2 bg-gray-800 text-xs text-white rounded overflow-auto">
                <p>Debug: isConnected={String(alephiumConnection.isConnected)}</p>
                <p>Debug: address={alephiumConnection.address || "null"}</p>
              </div>

              {isCheckingConnection ? (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35] mx-auto mb-4" />
                  <p>Checking wallet connection...</p>
                </div>
              ) : !alephiumConnection.isConnected ? (
                <div className="text-center py-6">
                  <p className="mb-4 text-amber-600">{t("viewYourTokens")}</p>
                  <WalletConnectDisplay />
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t("noTokensFound")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("token")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead className="text-right">{t("balance")}</TableHead>
                      <TableHead className="text-right">{t("value")} (ALPH)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => (
                      <TableRow key={token.symbol}>
                        <TableCell className="font-medium">{token.symbol}</TableCell>
                        <TableCell>{token.name}</TableCell>
                        <TableCell className="text-right">
                          {token.symbol === "ACYUM"
                            ? formatAcyumBalance(token.balance)
                            : formatAlphBalance(token.balance)}
                        </TableCell>
                        <TableCell className="text-right">{formatAlphBalance(token.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
}
