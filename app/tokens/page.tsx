"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useWallet } from "@/hooks/use-wallet"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { formatAlphBalance, formatAcyumBalance } from "@/lib/alephium-utils"
import { AlephiumConnectButton } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { checkDirectWalletConnection } from "@/lib/wallet-utils"

interface TokenBalance {
  symbol: string
  name: string
  balance: string
  value: string
}

export default function TokensPage() {
  const { isConnected, address } = useWallet()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [tokens, setTokens] = useState<TokenBalance[]>([])

  // Add direct connection state
  const [directAddress, setDirectAddress] = useState<string | null>(null)
  const [isDirectlyChecking, setIsDirectlyChecking] = useState(true)

  // Check direct connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsDirectlyChecking(true)
      try {
        const result = await checkDirectWalletConnection()
        console.log("Tokens page - Direct connection check result:", result)
        setDirectAddress(result.address)
      } catch (error) {
        console.error("Error checking direct connection:", error)
      } finally {
        setIsDirectlyChecking(false)
      }
    }

    checkConnection()

    // Set up periodic checks
    const intervalId = setInterval(checkConnection, 5000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const fetchTokens = async () => {
      // Only fetch if we have an address (either from our hook or direct check)
      const effectiveAddress = address || directAddress
      if (!effectiveAddress) {
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
  }, [isConnected, address, directAddress])

  // Determine if we should show the connected UI
  // IMPORTANT: We're being very aggressive here - if we have ANY address, show the connected UI
  const effectiveAddress = address || directAddress
  const showConnectedUI = !!effectiveAddress

  // Debug information
  console.log("Rendering TokensPage with state:", {
    isConnected,
    address,
    directAddress,
    showConnectedUI,
    isDirectlyChecking,
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
                <p>Debug: isConnected={String(isConnected)}</p>
                <p>Debug: address={address || "null"}</p>
                <p>Debug: directAddress={directAddress || "null"}</p>
                <p>Debug: showConnectedUI={String(showConnectedUI)}</p>
              </div>

              {isDirectlyChecking ? (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35] mx-auto mb-4" />
                  <p>Checking wallet connection...</p>
                </div>
              ) : !showConnectedUI ? (
                <div className="text-center py-6">
                  <p className="mb-4 text-amber-600">{t("viewYourTokens")}</p>
                  <AlephiumConnectButton />
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
