"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useWallet } from "@/hooks/use-wallet"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AlephiumConnectButton } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { checkDirectWalletConnection } from "@/lib/wallet-utils"

interface Transaction {
  id: string
  type: "deposit" | "withdraw"
  amount: string
  token: string
  timestamp: string
  status: "completed" | "pending" | "failed"
}

export default function TransactionsPage() {
  const { isConnected, address } = useWallet()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Add direct connection state
  const [directAddress, setDirectAddress] = useState<string | null>(null)
  const [isDirectlyChecking, setIsDirectlyChecking] = useState(true)

  // Check direct connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsDirectlyChecking(true)
      try {
        const result = await checkDirectWalletConnection()
        console.log("Transactions page - Direct connection check result:", result)
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
    const fetchTransactions = async () => {
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
        setTransactions([
          {
            id: "tx-001",
            type: "deposit",
            amount: "100.00",
            token: "ACYUM",
            timestamp: "2025-04-27T08:30:00Z",
            status: "completed",
          },
          {
            id: "tx-002",
            type: "withdraw",
            amount: "25.50",
            token: "ACYUM",
            timestamp: "2025-04-26T14:15:00Z",
            status: "completed",
          },
          {
            id: "tx-003",
            type: "deposit",
            amount: "5.00",
            token: "ALPH",
            timestamp: "2025-04-25T10:45:00Z",
            status: "completed",
          },
        ])
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [isConnected, address, directAddress])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Determine if we should show the connected UI
  // IMPORTANT: We're being very aggressive here - if we have ANY address, show the connected UI
  const effectiveAddress = address || directAddress
  const showConnectedUI = !!effectiveAddress

  // Debug information
  console.log("Rendering TransactionsPage with state:", {
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
          <h1 className="text-3xl font-bold mb-8 text-center">{t("transactionHistory")}</h1>

          <Card>
            <CardHeader>
              <CardTitle>{t("recentTransactions")}</CardTitle>
              <CardDescription>{t("viewTransactions")}</CardDescription>
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
                  <p className="mb-4 text-amber-600">{t("viewYourTransactions")}</p>
                  <AlephiumConnectButton />
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t("noTransactionsFound")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("type")}</TableHead>
                      <TableHead>{t("amount")}</TableHead>
                      <TableHead>{t("token")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {tx.type === "deposit" ? (
                              <ArrowDown className="mr-2 h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowUp className="mr-2 h-4 w-4 text-blue-500" />
                            )}
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </div>
                        </TableCell>
                        <TableCell>{tx.amount}</TableCell>
                        <TableCell>{tx.token}</TableCell>
                        <TableCell>{formatDate(tx.timestamp)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              tx.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : tx.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </span>
                        </TableCell>
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
