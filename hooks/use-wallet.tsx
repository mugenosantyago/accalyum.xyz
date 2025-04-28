"use client"

import type React from "react"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { useAlephium } from "@/components/alephium-provider"
import { WalletConnector, ConnectionMethod } from "@/lib/alephium"
import { useToast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"

export enum WalletConnectionState {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
  Error = "error",
}

export interface WalletError {
  code: string
  message: string
  details?: any
}

// Create a dummy wallet state for SSR
const dummyWalletState = {
  isConnected: false,
  address: null,
  balance: null,
  connectionState: WalletConnectionState.Disconnected,
  connectionMethod: ConnectionMethod.None,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
  deposit: async () => {},
  withdraw: async () => {},
  transfer: async () => undefined,
  refreshBalance: async () => {},
  setAddress: () => {},
  setIsConnected: () => {},
  setBalance: () => {},
  setConnectionMethod: () => {},
}

interface WalletState {
  isConnected: boolean
  address: string | null
  balance: string | null
  connectionState: WalletConnectionState
  connectionMethod: ConnectionMethod
  error: WalletError | null
  connect: (preferredMethod?: ConnectionMethod | string) => Promise<void>
  disconnect: () => Promise<void>
  deposit: (amount: string) => Promise<void>
  withdraw: (amount: string) => Promise<void>
  transfer: (to: string, amount: string) => Promise<string | undefined>
  refreshBalance: () => Promise<void>
  setAddress: (address: string | null) => void
  setIsConnected: (isConnected: boolean) => void
  setBalance: (balance: string | null) => void
  setConnectionMethod: (method: ConnectionMethod) => void
}

// Create a context for the wallet state
const WalletContext = createContext<WalletState>(dummyWalletState)

// Custom hook to use the wallet context
export function useWallet(): WalletState {
  const context = useContext(WalletContext)
  return context
}

// The actual implementation of the wallet state
function useWalletState(): WalletState {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined"
  const { toast } = useToast()
  const { isInitialized, nodeProvider } = useAlephium()

  // State
  const [connectionState, setConnectionState] = useState<WalletConnectionState>(WalletConnectionState.Disconnected)
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(ConnectionMethod.None)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [error, setError] = useState<WalletError | null>(null)

  // Derived state
  const isConnected = connectionState === WalletConnectionState.Connected

  const updateBalance = useCallback(
    async (walletAddress: string) => {
      if (!isBrowser) return
      try {
        const balanceValue = await WalletConnector.getInstance().getBalance(walletAddress)
        logger.info("useWallet: Updated balance for", walletAddress, "to", balanceValue)
        setBalance(balanceValue)
      } catch (error) {
        logger.error("Error fetching balance:", error)
        // Don't set error state here to avoid disrupting the UI
      }
    },
    [isBrowser],
  )

  // Check connection status on mount and when dependencies change
  useEffect(() => {
    // Skip if not in browser
    if (!isBrowser) return

    const checkConnection = async () => {
      // Don't check if we're already in a connecting state
      if (connectionState === WalletConnectionState.Connecting) return

      try {
        // Check window.alephium first as it's the most reliable indicator
        if (typeof window !== "undefined" && window.alephium) {
          try {
            const isConnected = await window.alephium.isConnected()
            if (isConnected) {
              const addr = await window.alephium.getSelectedAccount()
              if (addr) {
                logger.info("useWallet: Direct window.alephium connection found:", addr)
                setAddress(addr)
                setConnectionState(WalletConnectionState.Connected)
                setConnectionMethod(ConnectionMethod.Extension)
                await updateBalance(addr)

                // Force a re-render of components that might depend on this state
                window.dispatchEvent(
                  new CustomEvent("walletConnectionChanged", {
                    detail: { connected: true, address: addr },
                  }),
                )

                return
              }
            }
          } catch (err) {
            logger.warn("Error checking window.alephium connection:", err)
          }
        }

        // Then check our custom connection
        if (isInitialized && nodeProvider) {
          const walletInfo = await WalletConnector.getConnectedWallet()
          if (walletInfo) {
            logger.info("useWallet: Found connected wallet:", walletInfo)
            setAddress(walletInfo.address)
            setConnectionState(WalletConnectionState.Connected)
            setConnectionMethod(walletInfo.method)
            await updateBalance(walletInfo.address)

            // Force a re-render of components that might depend on this state
            window.dispatchEvent(
              new CustomEvent("walletConnectionChanged", {
                detail: { connected: true, address: walletInfo.address },
              }),
            )

            return
          }
        }

        // If we get here, we're not connected
        if (connectionState !== WalletConnectionState.Disconnected) {
          logger.info("useWallet: No connected wallet found, setting disconnected state")
          setConnectionState(WalletConnectionState.Disconnected)
          setConnectionMethod(ConnectionMethod.None)
          setAddress(null)

          // Force a re-render of components that might depend on this state
          window.dispatchEvent(
            new CustomEvent("walletConnectionChanged", {
              detail: { connected: false, address: null },
            }),
          )
        }
      } catch (err) {
        logger.error("Error checking wallet connection:", err)
        // Don't update state here to avoid disrupting any existing connection
      }
    }

    checkConnection()

    // Add a periodic check to ensure connection state stays in sync
    const intervalId = setInterval(checkConnection, 2000) // More frequent checks

    // Also listen for wallet events from the extension
    const handleAccountsChanged = () => {
      logger.info("Accounts changed event detected, rechecking connection")
      checkConnection()
    }

    if (typeof window !== "undefined" && window.alephium) {
      window.alephium.on?.("accountsChanged", handleAccountsChanged)
    }

    return () => {
      clearInterval(intervalId)
      if (typeof window !== "undefined" && window.alephium) {
        window.alephium.off?.("accountsChanged", handleAccountsChanged)
      }
    }
  }, [isInitialized, nodeProvider, connectionState, isBrowser])

  // Update balance when address changes
  useEffect(() => {
    if (!isBrowser) return
    if (address && isConnected) {
      updateBalance(address)
    }
  }, [address, isConnected, isBrowser, updateBalance])

  // Refresh balance function
  const refreshBalance = useCallback(async () => {
    if (!isBrowser) return
    if (address && isConnected) {
      await updateBalance(address)
    }
  }, [address, isConnected, isBrowser, updateBalance])

  // Connect function
  const connect = async (preferredMethod?: ConnectionMethod | string) => {
    if (!isBrowser) return

    // Clear previous errors
    setError(null)

    // Don't allow connecting if already connecting
    if (connectionState === WalletConnectionState.Connecting) {
      return
    }

    setConnectionState(WalletConnectionState.Connecting)

    try {
      logger.info("Starting wallet connection process with method:", preferredMethod || "auto")

      // Convert string method to enum if needed
      let methodEnum = preferredMethod
      if (preferredMethod === "walletconnect") {
        methodEnum = ConnectionMethod.WalletConnect
      } else if (preferredMethod === "extension") {
        methodEnum = ConnectionMethod.Extension
      } else if (typeof preferredMethod === "undefined") {
        methodEnum = undefined
      }

      // Check if window.alephium exists when trying to use extension
      if (methodEnum === ConnectionMethod.Extension && !window.alephium) {
        logger.info("Extension explicitly requested but not found in window object")
        throw new Error("Alephium extension not found. Please make sure it's installed and enabled.")
      }

      // Use our custom connect method
      const result = await WalletConnector.getInstance().connect(methodEnum as ConnectionMethod)

      logger.info("useWallet: Connected successfully:", result)
      setAddress(result.address)
      setConnectionState(WalletConnectionState.Connected)
      setConnectionMethod(result.method)
      await updateBalance(result.address)

      toast({
        title: "Wallet Connected",
        description: `Connected to address: ${formatAddress(result.address)}`,
        variant: "default",
      })
    } catch (error) {
      logger.error("Error connecting wallet:", error)

      setConnectionState(WalletConnectionState.Error)

      const errorMessage = error instanceof Error ? error.message : "Failed to connect wallet"
      const errorCode = error instanceof Error && "code" in error ? (error as any).code : "UNKNOWN_ERROR"

      setError({
        code: errorCode,
        message: errorMessage,
        details: error,
      })

      // Only show toast for errors that aren't related to missing wallet
      if (
        !errorMessage.includes("Alephium wallet not available") &&
        !errorMessage.includes("No compatible wallet found")
      ) {
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        })
      }

      throw error // Re-throw to allow handling in UI components
    }
  }

  // Disconnect function
  const disconnect = async () => {
    if (!isBrowser) return

    try {
      // Always call our custom disconnect
      WalletConnector.getInstance().disconnect()

      // Reset state
      setConnectionState(WalletConnectionState.Disconnected)
      setConnectionMethod(ConnectionMethod.None)
      setAddress(null)
      setBalance(null)
      setError(null)

      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
        variant: "default",
      })
    } catch (error) {
      logger.error("Error disconnecting:", error)
      toast({
        title: "Disconnect Error",
        description: "Failed to disconnect wallet properly",
        variant: "destructive",
      })
    }
  }

  // Helper function to format addresses
  const formatAddress = (addr: string): string => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  // Transaction functions
  const deposit = async (amount: string) => {
    if (!isBrowser) return

    if (!isConnected || !address) {
      const errorMsg = "Wallet not connected"
      setError({
        code: "NOT_CONNECTED",
        message: errorMsg,
      })

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
      return
    }

    try {
      await WalletConnector.getInstance().deposit(amount)
      await updateBalance(address)

      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${amount} ALPH`,
        variant: "default",
      })
    } catch (error) {
      logger.error("Error making deposit:", error)

      const errorMsg = error instanceof Error ? error.message : "Failed to make deposit"
      toast({
        title: "Deposit Error",
        description: errorMsg,
        variant: "destructive",
      })

      throw error
    }
  }

  const withdraw = async (amount: string) => {
    if (!isBrowser) return

    if (!isConnected || !address) {
      const errorMsg = "Wallet not connected"
      setError({
        code: "NOT_CONNECTED",
        message: errorMsg,
      })

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
      return
    }

    try {
      await WalletConnector.getInstance().withdraw(amount)
      await updateBalance(address)

      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${amount} ACYUM`,
        variant: "default",
      })
    } catch (error) {
      logger.error("Error making withdrawal:", error)

      const errorMsg = error instanceof Error ? error.message : "Failed to make withdrawal"
      toast({
        title: "Withdrawal Error",
        description: errorMsg,
        variant: "destructive",
      })

      throw error
    }
  }

  const transfer = async (to: string, amount: string) => {
    if (!isBrowser) return

    if (!isConnected || !address) {
      const errorMsg = "Wallet not connected"
      setError({
        code: "NOT_CONNECTED",
        message: errorMsg,
      })

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
      return
    }

    try {
      const txId = await WalletConnector.getInstance().transfer(to, amount)
      await updateBalance(address)

      toast({
        title: "Transfer Successful",
        description: `Successfully transferred ${amount} ALPH to ${to.substring(0, 6)}...${to.substring(to.length - 4)}`,
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
    }
  }

  // Create a function to update the address that logs the change
  const handleSetAddress = (newAddress: string | null) => {
    logger.info("useWallet: Setting address to", newAddress)
    setAddress(newAddress)
  }

  // Create a function to update the isConnected state that logs the change
  const handleSetIsConnected = (newIsConnected: boolean) => {
    logger.info("useWallet: Setting isConnected to", newIsConnected)
    setConnectionState(newIsConnected ? WalletConnectionState.Connected : WalletConnectionState.Disconnected)
  }

  const walletState = {
    isConnected,
    address,
    balance,
    connectionState,
    connectionMethod,
    error,
    connect,
    disconnect,
    deposit,
    withdraw,
    transfer,
    refreshBalance,
    setAddress: handleSetAddress,
    setIsConnected: handleSetIsConnected,
    setBalance: (newBalance: string | null) => setBalance(newBalance),
    setConnectionMethod: (method: ConnectionMethod) => setConnectionMethod(method),
  }

  return walletState
}

// Create a provider component for the wallet state
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const walletState = useWalletState()

  return <WalletContext.Provider value={walletState}>{children}</WalletContext.Provider>
}
