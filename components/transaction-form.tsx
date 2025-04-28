"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Send } from "lucide-react"
import { AddressValidator } from "@/components/address-validator"
import { formatAlphBalance } from "@/lib/alephium-utils"
import { useWalletTransactions } from "@/hooks/use-wallet-transactions"
import { AlephiumConnectButton } from "@/components/alephium-connect-button"

interface TransactionFormProps {
  onSuccess?: (txId: string) => void
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { isConnected, address, transfer, isProcessing } = useWalletTransactions()
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [balance, setBalance] = useState("0")
  const [isLocalProcessing, setIsLocalProcessing] = useState(false)

  // Fetch balance when component mounts or address changes
  React.useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!recipient || !amount || Number.parseFloat(amount) <= 0) {
      alert("Please enter a valid recipient address and amount")
      return
    }

    setIsLocalProcessing(true)

    try {
      const txId = await transfer(recipient, amount)
      setRecipient("")
      setAmount("")
      if (onSuccess && txId) {
        onSuccess(txId)
      }
    } catch (error) {
      console.error("Transaction error:", error)
    } finally {
      setIsLocalProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send ALPH</CardTitle>
        <CardDescription>Transfer ALPH to another address</CardDescription>
      </CardHeader>

      <CardContent>
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="mb-4 text-amber-600">Please connect your wallet to make transfers</p>
            <AlephiumConnectButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="Enter recipient address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
              {recipient && <AddressValidator address={recipient} showDetails={true} />}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ALPH)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {isConnected && (
                <p className="text-xs text-gray-400">Available balance: {formatAlphBalance(balance || "0")} ALPH</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
              disabled={isProcessing || isLocalProcessing}
            >
              {isProcessing || isLocalProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
