"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { useWallet } from "@alephium/web3-react"
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { account, connectionStatus } = useWallet();
  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true)
      setError(null)
      
      if (!isConnected || !address) {
        setTransactions([])
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/transactions?address=${encodeURIComponent(address)}`)
        // ... rest of fetch logic ...
      } catch (error) {
        console.error("Error fetching transactions:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        setTransactions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [address, isConnected])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

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
              {!isConnected ? (
                <div className="text-center py-6">
                  <p className="mb-4 text-amber-600">{t("connectToViewHistory")}</p>
                  <WalletConnectDisplay />
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                </div>
              ) : error ? (
                <div className="text-center py-6">
                  <p className="text-red-500">{error}</p>
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
