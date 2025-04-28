"use client"

import { useState, useCallback } from "react"
import { useWalletDetector } from "./use-wallet-detector"
import { logger } from "@/lib/logger"
import { useToast } from "@/components/ui/use-toast"
import { config } from "@/lib/config"

export function useWalletTransactions() {
  const { isConnected, address, checkConnection } = useWalletDetector()
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const transfer = useCallback(
    async (to: string, amount: string): Promise<string | undefined> => {
      if (!isConnected || !address) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        })
        return
      }

      if (!window.alephium) {
        toast({
          title: "Error",
          description: "Alephium wallet not available",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)

      try {
        const txId = await window.alephium.signAndSubmitTransferTx({
          from: address,
          to,
          amount,
        })

        toast({
          title: "Transfer Successful",
          description: `Successfully transferred ${amount} ALPH`,
          variant: "default",
        })

        return txId
      } catch (error) {
        logger.error("Error making transfer:", error)
        const errorMsg = error instanceof Error ? error.message : "Failed to make transfer"

        toast({
          title: "Transfer Error",
          description: errorMsg,
          variant: "destructive",
        })

        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [isConnected, address, toast],
  )

  const deposit = useCallback(
    async (amount: string): Promise<string | undefined> => {
      if (!isConnected || !address) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        })
        return
      }

      if (!window.alephium) {
        toast({
          title: "Error",
          description: "Alephium wallet not available",
          variant: "destructive",
        })
        return
      }

      if (!config.alephium.contractAddress) {
        toast({
          title: "Error",
          description: "Contract address not configured",
          variant: "destructive",
        })
        return
      }

      if (!config.alephium.acyumTokenId) {
        toast({
          title: "Error",
          description: "ACYUM token ID not configured",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)

      try {
        // Import the bytecode template dynamically
        const makeDepositJson = await import("@/contracts/make-deposit-json").then((mod) => mod.default)

        const txId = await window.alephium.signAndSubmitExecuteScriptTx({
          bytecode: makeDepositJson.bytecodeTemplate,
          args: {
            depositContract: config.alephium.contractAddress,
            amount,
          },
          tokens: [{ id: config.alephium.acyumTokenId, amount }],
        })

        toast({
          title: "Deposit Successful",
          description: `Successfully deposited ${amount} ALPH`,
          variant: "default",
        })

        return txId
      } catch (error) {
        logger.error("Error making deposit:", error)
        const errorMsg = error instanceof Error ? error.message : "Failed to make deposit"

        toast({
          title: "Deposit Error",
          description: errorMsg,
          variant: "destructive",
        })

        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [isConnected, address, toast],
  )

  const withdraw = useCallback(
    async (amount: string): Promise<string | undefined> => {
      if (!isConnected || !address) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        })
        return
      }

      if (!window.alephium) {
        toast({
          title: "Error",
          description: "Alephium wallet not available",
          variant: "destructive",
        })
        return
      }

      if (!config.alephium.acyumTokenId) {
        toast({
          title: "Error",
          description: "ACYUM token ID not configured",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)

      try {
        // Import the bytecode template dynamically
        const withdrawJson = await import("@/contracts/withdraw-json").then((mod) => mod.default)

        const txId = await window.alephium.signAndSubmitExecuteScriptTx({
          bytecode: withdrawJson.bytecodeTemplate,
          args: {
            token: config.alephium.acyumTokenId,
            amount,
          },
        })

        toast({
          title: "Withdrawal Successful",
          description: `Successfully withdrew ${amount} ACYUM`,
          variant: "default",
        })

        return txId
      } catch (error) {
        logger.error("Error making withdrawal:", error)
        const errorMsg = error instanceof Error ? error.message : "Failed to make withdrawal"

        toast({
          title: "Withdrawal Error",
          description: errorMsg,
          variant: "destructive",
        })

        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [isConnected, address, toast],
  )

  return {
    isConnected,
    address,
    isProcessing,
    transfer,
    deposit,
    withdraw,
    checkConnection,
  }
}
