"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDown, ArrowUp, Loader2, Heart, Coins, Handshake } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { useWallet } from "@alephium/web3-react"
import { ConnectionSuccessModal } from "@/components/connection-success-modal"
import { logger } from "@/lib/logger"

interface Transaction {
  _id: string;
  address: string;
  type: "deposit" | "withdraw" | "donation" | "interest_payout" | "vote_payment";
  token: 'ALPH' | 'YUM' | 'sWEA';
  amount: string;
  txId: string;
  initiative?: string;
  timestamp: string;
}

// Renamed component
export default function TransactionsClient() {
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
        logger.info(`Fetching transactions for address: ${address}`); // Log actual attempt
        const response = await fetch(`/api/transactions?address=${encodeURIComponent(address)}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch transactions");
        }
        
        const data = await response.json();
        setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
        logger.info(`Fetched ${data.transactions?.length || 0} transactions.`);

      } catch (error) {
        logger.error("Error fetching transactions:", error)
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

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDown className="mr-2 h-4 w-4 text-green-500" />;
      case 'withdraw':
        return <ArrowUp className="mr-2 h-4 w-4 text-blue-500" />;
      case 'donation':
        return <Heart className="mr-2 h-4 w-4 text-red-500" />;
      case 'interest_payout':
        return <Coins className="mr-2 h-4 w-4 text-yellow-500" />;
      case 'vote_payment':
        return <Handshake className="mr-2 h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("transactionHistory")}</h1>

          <ConnectionSuccessModal featureName="Transactions" />

          <Card>
            <CardHeader>
              <CardTitle>{t("recentTransactions")}</CardTitle>
              <CardDescription>{t("viewTransactions")}</CardDescription>
            </CardHeader>

            <CardContent>
              {!isConnected ? (
                <div className="text-center py-6">
                  <p className="mb-4 text-amber-600">Please connect your wallet to view transaction history.</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getTypeIcon(tx.type)}
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                            {tx.type === 'donation' && tx.initiative && (
                              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({tx.initiative})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tx.amount}</TableCell>
                        <TableCell>{tx.token}</TableCell>
                        <TableCell>{formatDate(tx.timestamp)}</TableCell>
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