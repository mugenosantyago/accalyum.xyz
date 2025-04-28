"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "./use-wallet"
import { ConnectionMethod } from "@/lib/alephium"

/**
 * This hook provides a more reliable way to check if a wallet is connected
 * by checking both our custom wallet state and the window.alephium object directly
 */
export function useReliableWallet() {
  const { isConnected, address, balance, connect, setAddress, setIsConnected, setConnectionMethod, ...rest } =
    useWallet()
  const [reliableIsConnected, setReliableIsConnected] = useState(isConnected)
  const [reliableAddress, setReliableAddress] = useState(address)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  // More aggressive connection checker that tries multiple methods
  const checkAllConnectionMethods = useCallback(async () => {
    setIsCheckingConnection(true)
    console.log("useReliableWallet: Checking all connection methods")

    // First check our custom state
    if (isConnected && address) {
      console.log("useReliableWallet: Already connected via custom state", { address })
      setReliableIsConnected(true)
      setReliableAddress(address)
      setIsCheckingConnection(false)
      return true
    }

    // Check for WalletConnect connection
    // This would need to be implemented if using WalletConnect

    // Then check window.alephium directly (most important)
    if (typeof window !== "undefined" && window.alephium) {
      try {
        console.log("useReliableWallet: Checking window.alephium direct connection")
        const isDirectlyConnected = await window.alephium.isConnected()
        console.log("useReliableWallet: window.alephium.isConnected() =", isDirectlyConnected)

        if (isDirectlyConnected) {
          try {
            const directAddress = await window.alephium.getSelectedAccount()
            console.log("useReliableWallet: Direct connection detected", { directAddress })

            if (directAddress) {
              // Update our local state
              setReliableIsConnected(true)
              setReliableAddress(directAddress)

              // Also try to sync the main wallet state
              if (!isConnected || address !== directAddress) {
                console.log("useReliableWallet: Syncing wallet state with direct connection")
                setAddress(directAddress)
                setIsConnected(true)
                setConnectionMethod(ConnectionMethod.Extension)
              }

              setIsCheckingConnection(false)
              return true
            }
          } catch (err) {
            console.warn("useReliableWallet: Error getting address from direct connection", err)
          }
        }
      } catch (err) {
        console.warn("useReliableWallet: Error checking direct connection", err)
      }
    }

    // Final fallback for previously detected connections
    if (reliableIsConnected && reliableAddress) {
      console.log("useReliableWallet: Using previously detected connection", { reliableAddress })
      setIsCheckingConnection(false)
      return true
    }

    // If we get here, we're not connected
    console.log("useReliableWallet: No connection detected")
    setReliableIsConnected(false)
    setReliableAddress(null)
    setIsCheckingConnection(false)
    return false
  }, [isConnected, address, reliableIsConnected, reliableAddress, setAddress, setIsConnected, setConnectionMethod])

  // Check connection on mount and periodically
  useEffect(() => {
    // Initial check
    checkAllConnectionMethods()

    // Set up polling for continuous checking
    const intervalId = setInterval(checkAllConnectionMethods, 2000)

    return () => clearInterval(intervalId)
  }, [checkAllConnectionMethods])

  // Set up a specific handler for window events that might indicate connection changes
  useEffect(() => {
    const handlePotentialConnectionChange = () => {
      console.log("useReliableWallet: Potential connection change detected, rechecking...")
      checkAllConnectionMethods()
    }

    // Listen for focus events which might indicate the user just connected
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handlePotentialConnectionChange)

      // Try to listen for custom events from wallet extensions if they exist
      window.addEventListener("alephium_chainChanged", handlePotentialConnectionChange)
      window.addEventListener("alephium_accountsChanged", handlePotentialConnectionChange)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handlePotentialConnectionChange)
        window.removeEventListener("alephium_chainChanged", handlePotentialConnectionChange)
        window.removeEventListener("alephium_accountsChanged", handlePotentialConnectionChange)
      }
    }
  }, [checkAllConnectionMethods])

  return {
    isConnected: reliableIsConnected,
    address: reliableAddress || address,
    isCheckingConnection,
    balance,
    connect: async () => {
      try {
        await connect()
        checkAllConnectionMethods()
      } catch (error) {
        console.error("useReliableWallet: Connect error", error)
        // Even if our connect fails, try direct detection
        checkAllConnectionMethods()
      }
    },
    checkConnection: checkAllConnectionMethods,
    ...rest,
  }
}
