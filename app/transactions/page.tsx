"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AlephiumConnectButton } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { checkAlephiumConnection } from "@/lib/wallet-utils"
import { ConnectionSuccessModal } from "@/components/connection-success-modal"

interface Transaction {
  id: string
  type: "deposit" | "withdraw"
  amount: string
  token: string
  timestamp: string
  status: "completed" | "pending" | "failed"
}

export default function TransactionsPage() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Alephium connection state
  const [alephiumConnection, setAlephiumConnection] = useState({
    isConnected: false,
    address: ""
  })
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  // Check direct connection on mount using Alephium's native methods
  useEffect(() => {
    const checkConnection = async () => {
      setIsCheckingConnection(true)
      try {
        const { connected, address } = await checkAlephiumConnection()
        console.log("Direct Alephium connection check result:", connected, address)
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

    // Listen for Alephium's accountsChanged event
    const handleAccountsChanged = () => {
      console.log("Accounts changed event detected, rechecking connection")
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

  useEffect(() => {
    const fetchTransactions = async () => {
      // Only fetch if we have an address
      if (!alephiumConnection.address) {
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
  }, [alephiumConnection.address])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Debug information
  console.log("Rendering TransactionsPage with state:", {
    alephiumConnection,
    isCheckingConnection,
  })

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("transactionHistory")}</h1>

          <ConnectionSuccessModal featureName="Transaction History" />

          <Card>
            <CardHeader>
              <CardTitle>{t("recentTransactions")}</CardTitle>
              <CardDescription>{t("viewTransactions")}</CardDescription>
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
