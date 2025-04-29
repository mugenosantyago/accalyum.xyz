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

// The actual implementation of the wallet state (Reverted to polling version)
function useWalletState(): WalletState {
  const isBrowser = typeof window !== "undefined"
  const { toast } = useToast()
  // Assuming useAlephium is needed for WalletConnector init - keep for now
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
        // Use WalletConnector for balance for consistency
        const balanceValue = await WalletConnector.getInstance().getBalance(walletAddress)
        logger.info("useWallet: Updated balance for", walletAddress, "to", balanceValue)
        setBalance(balanceValue)
      } catch (error) {
        logger.error("Error fetching balance:", error)
      }
    },
    [isBrowser],
  )

  // Check connection status on mount and when dependencies change
  useEffect(() => {
    if (!isBrowser) return

    let connectIntervalId: NodeJS.Timeout | null = null;
    let checkIntervalId: NodeJS.Timeout | null = null;
    let accountsChangedListenerAttached = false;

    const checkConnection = async (initialLog = false) => {
      if (connectionState === WalletConnectionState.Connecting) {
        // console.log("useWallet DEBUG: Already connecting, skipping check.")
        return
      }
      if (initialLog) {
        console.log(`useWallet DEBUG: Starting checkConnection. Current state: ${connectionState}`)
      }
      try {
        if (typeof window !== "undefined" && window.alephium) {
           try {
            const isExtConnected = await window.alephium.isConnected()
            if (isExtConnected) {
              const addr = await window.alephium.getSelectedAccount()
              if (addr) {
                if (connectionState !== WalletConnectionState.Connected || address !== addr) {
                   console.log("useWallet DEBUG: Extension connection detected. Updating state.", addr)
                   setAddress(addr)
                   setConnectionState(WalletConnectionState.Connected)
                   setConnectionMethod(ConnectionMethod.Extension)
                   await updateBalance(addr)
                   window.dispatchEvent(new CustomEvent("walletConnectionChanged", { detail: { connected: true, address: addr } }))
                }
                return // Found connection, exit check
              }
            }
          } catch (err) {
             console.warn("useWallet DEBUG: Error checking window.alephium connection:", err)
             logger.warn("Error checking window.alephium connection:", err)
          }
        }
        
        // If we get here, extension check failed or no extension found
        if (connectionState !== WalletConnectionState.Disconnected) {
           console.log("useWallet DEBUG: No connected wallet found via extension check. Setting disconnected state.") 
           setConnectionState(WalletConnectionState.Disconnected)
           setConnectionMethod(ConnectionMethod.None)
           setAddress(null)
           setBalance(null)
           window.dispatchEvent(new CustomEvent("walletConnectionChanged", { detail: { connected: false, address: null } }))
        } 
      } catch (err) {
         console.error("useWallet DEBUG: Error in checkConnection try block:", err) 
      }
    };

    const handleAccountsChanged = () => {
       console.log("useWallet DEBUG: accountsChanged event detected, rechecking connection.") 
       checkConnection(false) 
    };

    const setupConnectionLogic = () => {
      console.log("useWallet DEBUG: Setting up connection logic (checking status and attaching listener).");
      checkConnection(true); 
      if (!accountsChangedListenerAttached && typeof window !== "undefined" && window.alephium) {
        try {
          window.alephium.on?.("accountsChanged", handleAccountsChanged);
          accountsChangedListenerAttached = true;
          console.log("useWallet DEBUG: accountsChanged listener ATTACHED successfully.");
        } catch (err) {
          console.error("useWallet DEBUG: FAILED to attach accountsChanged listener:", err);
        }
      }
      if (!checkIntervalId) {
         console.log("useWallet DEBUG: Starting periodic connection checks.")
         checkIntervalId = setInterval(() => checkConnection(false), 5000);
      }
    };

    // --- Main Logic --- 
    if (typeof window !== "undefined" && window.alephium) {
      console.log("useWallet DEBUG: window.alephium FOUND on initial mount/effect run.");
      setupConnectionLogic();
    } else {
      console.log("useWallet DEBUG: window.alephium NOT FOUND initially. Starting polling interval.");
      connectIntervalId = setInterval(() => {
        if (typeof window !== "undefined" && window.alephium) {
          console.log("useWallet DEBUG: window.alephium FOUND via polling interval.");
          if (connectIntervalId) clearInterval(connectIntervalId);
          // Crucially, also set up listeners etc. *after* finding it via polling
          setupConnectionLogic(); 
        } else {
           console.log("useWallet DEBUG: Polling... window.alephium still not found."); // Log more frequently
        }
      }, 200); // Poll frequently until found
    }

    // --- Cleanup --- 
    return () => {
       console.log("useWallet DEBUG: Cleaning up useEffect.") 
       if (connectIntervalId) clearInterval(connectIntervalId);
       if (checkIntervalId) clearInterval(checkIntervalId);
       if (accountsChangedListenerAttached && typeof window !== "undefined" && window.alephium) {
         try {
           window.alephium.off?.("accountsChanged", handleAccountsChanged);
           console.log("useWallet DEBUG: accountsChanged listener REMOVED successfully.");
         } catch (err) {
           console.error("useWallet DEBUG: FAILED to remove accountsChanged listener:", err);
         }
       }
    };
  // Dependencies: React to browser, alephium provider init
  }, [isInitialized, nodeProvider, isBrowser, updateBalance, connectionState, address]); // Added connectionState and address back

  // Refresh balance function (using custom logic)
  const refreshBalance = useCallback(async () => {
    if (!isBrowser) return
    if (address && isConnected) {
       console.log("useWallet DEBUG: Refreshing balance for", address)
      await updateBalance(address)
    }
  }, [address, isConnected, isBrowser, updateBalance])

  // Connect function (using WalletConnector)
  const connect = async (preferredMethod?: ConnectionMethod | string) => {
    if (!isBrowser) return
    setError(null)
    if (connectionState === WalletConnectionState.Connecting) {
      console.log("useWallet DEBUG: Connect called while already connecting.")
      return
    }
    console.log("useWallet DEBUG: connect() called with method:", preferredMethod)
    setConnectionState(WalletConnectionState.Connecting)
    try {
      let methodEnum = preferredMethod
      if (typeof preferredMethod === "string") { // Basic conversion if string is passed
         methodEnum = ConnectionMethod[preferredMethod as keyof typeof ConnectionMethod] || undefined;
      }
      
      // Use our custom WalletConnector class
      const result = await WalletConnector.getInstance().connect(methodEnum as ConnectionMethod)
      console.log("useWallet DEBUG: Connect successful via WalletConnector:", result)
      setAddress(result.address)
      setConnectionState(WalletConnectionState.Connected)
      setConnectionMethod(result.method)
      await updateBalance(result.address)
      toast({
        title: "Wallet Connected",
        description: `Connected: ${result.address.substring(0, 6)}...`,
        variant: "default",
      })
       window.dispatchEvent(new CustomEvent("walletConnectionChanged", { detail: { connected: true, address: result.address } }))
    } catch (error) {
       console.error("useWallet DEBUG: Connect failed:", error)
       logger.error("Failed to connect wallet:", error)
      setError({ code: "CONNECTION_FAILED", message: error instanceof Error ? error.message : "Unknown error", details: error })
      setConnectionState(WalletConnectionState.Error) // Set specific Error state
      setAddress(null)
      setBalance(null)
      setConnectionMethod(ConnectionMethod.None)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Could not connect wallet.",
        variant: "destructive",
      })
       window.dispatchEvent(new CustomEvent("walletConnectionChanged", { detail: { connected: false, address: null } }))
    }
  }

  // Disconnect function (using WalletConnector)
  const disconnect = async () => {
    if (!isBrowser) return
     console.log("useWallet DEBUG: disconnect() called. Current state:", connectionState, connectionMethod) 
    try {
      // Use our custom WalletConnector
      await WalletConnector.getInstance().disconnect()
      // Reset internal state
      setAddress(null)
      setBalance(null)
      setConnectionState(WalletConnectionState.Disconnected)
      setConnectionMethod(ConnectionMethod.None)
      setError(null)
      logger.info("useWallet: Wallet disconnected successfully")
      toast({ title: "Wallet Disconnected" })
       window.dispatchEvent(new CustomEvent("walletConnectionChanged", { detail: { connected: false, address: null } }))
    } catch (error) {
       console.error("useWallet DEBUG: Error during disconnect:", error)
       logger.error("Failed to disconnect wallet:", error)
      setError({ code: "DISCONNECT_FAILED", message: error instanceof Error ? error.message : "Unknown error", details: error })
      // Reset state even on error
      setAddress(null)
      setBalance(null)
      setConnectionState(WalletConnectionState.Disconnected)
      setConnectionMethod(ConnectionMethod.None)
      toast({ title: "Disconnection Error", description: "An error occurred.", variant: "destructive" })
    }
  }

  // Placeholder transaction functions (should use WalletConnector or Signer)
  const deposit = async (amount: string) => {
    if (!isConnected || !address) throw new Error("Wallet not connected")
    console.log(`useWallet DEBUG: Placeholder deposit: ${amount} from ${address}`)
    // TODO: Implement using WalletConnector.getInstance()... or Signer
    await new Promise(resolve => setTimeout(resolve, 1000))
    await refreshBalance()
  }
  const withdraw = async (amount: string) => {
    if (!isConnected || !address) throw new Error("Wallet not connected")
    console.log(`useWallet DEBUG: Placeholder withdraw: ${amount} from ${address}`)
    // TODO: Implement
    await new Promise(resolve => setTimeout(resolve, 1000))
    await refreshBalance()
  }
  const transfer = async (to: string, amount: string): Promise<string | undefined> => {
    if (!isConnected || !address) throw new Error("Wallet not connected")
    console.log(`useWallet DEBUG: Placeholder transfer: ${amount} to ${to} from ${address}`)
    // TODO: Implement
    await new Promise(resolve => setTimeout(resolve, 1000))
    await refreshBalance()
    return "placeholder_tx_id"
  }

  // Manual state setters - REMOVED as state should be managed internally
  const handleSetAddress = () => {}
  const handleSetIsConnected = () => {}
  const handleSetBalance = () => {}
  const handleSetConnectionMethod = () => {}

  return {
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
    // Remove manual setters from return
    setAddress: handleSetAddress,
    setIsConnected: handleSetIsConnected,
    setBalance: handleSetBalance,
    setConnectionMethod: handleSetConnectionMethod,
  }
}

// WalletProvider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const walletState = useWalletState()
  return <WalletContext.Provider value={walletState}>{children}</WalletContext.Provider>
}
