"use client"

import { useState, useCallback } from "react"
import { logger } from "@/lib/logger"
import { useToast } from "@/components/ui/use-toast"
import { config } from "@/lib/config"
import { useWallet } from "@alephium/web3-react"

export function useWalletTransactions() {
  const { signer, account, connectionStatus } = useWallet()
  const address = account?.address ?? null
  const isConnected = connectionStatus === 'connected' && !!address;
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const transfer = useCallback(
    async (to: string, amount: string): Promise<string | undefined> => {
      if (!isConnected || !address || !signer) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)

      try {
        const txId = await signer.signAndSubmitTransferTx({
          signerAddress: address,
          destinations: [{
            address: to,
            attoAlphAmount: BigInt(amount)
          }]
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
    [isConnected, address, signer, toast],
  )

  const deposit = useCallback(
    async (amount: string): Promise<string | undefined> => {
      if (!isConnected || !address || !signer) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        })
        return
      }

      if (!config.alephium.depositContractAddress) {
        toast({
          title: "Error",
          description: "Contract address not configured",
          variant: "destructive",
        })
        return
      }

      if (!config.alephium.yumTokenIdHex) {
        toast({
          title: "Error",
          description: "YUM token ID not configured",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)

      try {
        // Import the bytecode template dynamically
        const makeDepositJson = await import("@/contracts/make-deposit-json").then((mod) => mod.default)

        const txId = await signer.signAndSubmitExecuteScriptTx({
          signerAddress: address,
          bytecode: makeDepositJson.bytecodeTemplate,
          args: {
            depositContract: config.alephium.depositContractAddress,
            amount,
          },
          tokens: [{ id: config.alephium.yumTokenIdHex, amount: BigInt(amount) }],
        })

        toast({
          title: "Deposit Successful",
          description: `Successfully deposited ${amount} YUM`,
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
    [isConnected, address, signer, toast],
  )

  const withdraw = useCallback(
    async (amount: string): Promise<string | undefined> => {
      if (!isConnected || !address || !signer) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        })
        return
      }

      if (!config.alephium.yumTokenIdHex) {
        toast({
          title: "Error",
          description: "YUM token ID not configured",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)

      try {
        // Import the bytecode template dynamically
        const withdrawJson = await import("@/contracts/withdraw-json").then((mod) => mod.default)

        const txId = await signer.signAndSubmitExecuteScriptTx({
          signerAddress: address,
          bytecode: withdrawJson.bytecodeTemplate,
          args: {
            token: config.alephium.yumTokenIdHex,
            amount: BigInt(amount),
          },
        })

        toast({
          title: "Withdrawal Successful",
          description: `Successfully withdrew ${amount} YUM`,
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
    [isConnected, address, signer, toast],
  )

  return {
    isConnected,
    address,
    isProcessing,
    transfer,
    deposit,
    withdraw,
  }
}
