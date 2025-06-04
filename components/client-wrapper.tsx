"use client"

import { type ReactNode, useEffect, useState } from "react"
import { AlephiumWalletProvider } from "@alephium/web3-react"
import { AlephiumProvider } from "@/components/alephium-provider"
import { WalletProvider } from "@/hooks/use-wallet"
import { ModernNav } from "@/components/modern-nav"
import { Footer } from "@/components/footer"
import { useAlephiumCompat } from "@/hooks/use-alephium-compat"
import { useWallet } from "@/hooks/use-wallet"

export function ClientWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { isConnected, connect } = useWallet()

  // Get environment variables with fallbacks
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "31a36ede551882a3a3147483688a9978"
  const network = process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || "mainnet"

  useEffect(() => {
    try {
      setMounted(true)

      // Check for wallet connection on mount
      const checkWalletConnection = async () => {
        if (typeof window !== "undefined" && window.alephium) {
          try {
            const isAlreadyConnected = await window.alephium.isConnected()
            if (isAlreadyConnected && !isConnected) {
              // If wallet is connected but our state doesn't reflect it, update the state
              console.log("Wallet is connected but state doesn't reflect it, updating...")
              await connect()
            }
          } catch (err) {
            console.warn("Error checking wallet connection on mount:", err)
          }
        }
      }

      checkWalletConnection()
    } catch (err) {
      console.error("Error in ClientWrapper:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [isConnected, connect])

  // If there's an error, show a simple error message
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
        <p className="text-gray-500 mb-4 max-w-md">
          We encountered an error while loading the application. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#FF6B35] text-white rounded-md hover:bg-[#E85A2A]"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  // During SSR or before mounting, render a minimal version
  if (!mounted) {
    return (
      <>
        <div className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-800"></div>
              <span className="font-bold text-2xl gradient-text hidden md:block">Accalyum Network</span>
            </div>
          </div>
        </div>
        {children}
        <div className="bg-gray-900 py-8 mt-16">
          <div className="container mx-auto px-4">
            <p className="text-center text-gray-500">© {new Date().getFullYear()} Accalyum Network</p>
          </div>
        </div>
      </>
    )
  }

  // Once mounted on the client, wrap with all providers
  return (
    <AlephiumProvider>
      <AlephiumWalletProvider
        network={network}
        addressGroup={0}
        walletConnectProjectId={projectId}
        walletConnectOptions={{
          projectId: projectId,
          metadata: {
            name: "Accalyum Network",
            description: "Accalyum Network dApp",
            url: "https://accalyum.xyz",
            icons: ["https://accalyum.xyz/images/logo.png"],
          },
        }}
      >
        <WalletProvider>
          <AlephiumCompatLayer>
            <ModernNav />
            {children}
            <Footer />
          </AlephiumCompatLayer>
        </WalletProvider>
      </AlephiumWalletProvider>
    </AlephiumProvider>
  )
}

// This component ensures the compatibility hook is used
function AlephiumCompatLayer({ children }: { children: ReactNode }) {
  // Use the compatibility hook to sync wallet states
  useAlephiumCompat()
  return <>{children}</>
}
