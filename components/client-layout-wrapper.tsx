"use client"

import type React from "react"
import { AlephiumWalletProvider } from "@alephium/web3-react"
import { ClientProviders } from "@/components/client-providers"
import { ModernNav } from "@/components/modern-nav"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import { config } from "@/lib/config"

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || config.alephium.walletConnectProjectId
  const networkId = process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || config.alephium.network

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR, just render children without any client-side logic
  if (!mounted) {
    return (
      <>
        <div className="h-16 bg-gray-900">{/* Placeholder for nav */}</div>
        <main className="flex-grow pt-20">{children}</main>
        <Footer />
      </>
    )
  }

  return (
    <AlephiumWalletProvider network={networkId as any} addressGroup={0} walletConnectProjectId={walletConnectProjectId}>
      <ClientProviders>
        <ModernNav />
        <main className="flex-grow pt-20">{children}</main>
        <Footer />
      </ClientProviders>
    </AlephiumWalletProvider>
  )
}
