"use client"

import { useEffect, useRef } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useWallet as useAlephiumWallet } from "@alephium/web3-react"
import { ConnectionMethod } from "@/lib/alephium"
import { logger } from "@/lib/logger"

/**
 * This hook provides compatibility between our custom wallet hooks
 * and the official Alephium React hooks
 */
export function useAlephiumCompat() {
  const { account, connectionStatus, balance: officialBalance, signer } = useAlephiumWallet()

  const {
    setAddress,
    setIsConnected,
    setBalance,
    setConnectionMethod,
    isConnected: customIsConnected,
    address: customAddress,
    connectionState,
  } = useWallet()

  const syncedRef = useRef(false)

  // Sync the official wallet state with our custom wallet state
  useEffect(() => {
    // Only run this effect on the client side
    if (typeof window === "undefined") return

    logger.info("useAlephiumCompat: Official wallet state changed", {
      address: account?.address,
      connectionStatus,
      balance: officialBalance?.toString(),
      signer: signer ? "present" : "absent",
      customIsConnected,
      customAddress,
      connectionState,
    })

    // If official wallet is connected
    if (connectionStatus === "connected" && account?.address) {
      logger.info("useAlephiumCompat: Setting connected state with address:", account.address)
      setAddress(account.address)
      setIsConnected(true)
      setConnectionMethod(ConnectionMethod.Extension)
      syncedRef.current = true

      // Also sync the balance if available
      if (officialBalance) {
        setBalance(officialBalance.toString())
      }
    }
    // If official wallet is disconnected but our custom state thinks it's connected
    else if (connectionStatus !== "connected" && customIsConnected && syncedRef.current) {
      logger.info("useAlephiumCompat: Setting disconnected state")
      setIsConnected(false)
      setAddress(null)
      setBalance(null)
      syncedRef.current = false
    }

    // Check for direct window.alephium connection as a fallback
    const checkDirectConnection = async () => {
      if (!customIsConnected && typeof window !== "undefined" && window.alephium) {
        try {
          const isDirectlyConnected = await window.alephium.isConnected()
          if (isDirectlyConnected) {
            const directAddress = await window.alephium.getSelectedAccount()
            if (directAddress) {
              logger.info("useAlephiumCompat: Found direct connection:", directAddress)
              setAddress(directAddress)
              setIsConnected(true)
              setConnectionMethod(ConnectionMethod.Extension)
              syncedRef.current = true
            }
          }
        } catch (err) {
          logger.warn("Error checking direct connection:", err)
        }
      }
    }

    checkDirectConnection()
  }, [
    account,
    connectionStatus,
    officialBalance,
    customIsConnected,
    customAddress,
    connectionState,
    signer,
    setAddress,
    setIsConnected,
    setBalance,
    setConnectionMethod,
  ])

  return {
    // Return any needed values
    isSynced: syncedRef.current,
  }
}
