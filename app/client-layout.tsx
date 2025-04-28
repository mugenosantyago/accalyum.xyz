"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from "@/components/ui/toaster"
import { AlephiumWalletProvider } from "@alephium/web3-react"
import { ClientProviders } from "@/components/client-providers"
import { ModernNav } from "@/components/modern-nav"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""
  const networkId = process.env.NEXT_PUBLIC_ALEPHIUM_NETWORK || "mainnet"

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR, just render children without any client-side logic
  if (!mounted) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <LanguageProvider>
          <div className="h-16 bg-gray-900">{/* Placeholder for nav */}</div>
          <main className="flex-grow pt-20">{children}</main>
          <Footer />
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <AlephiumWalletProvider
          network={networkId as any}
          addressGroup={0}
          walletConnectProjectId={walletConnectProjectId}
        >
          <ClientProviders>
            <ModernNav />
            <main className="flex-grow pt-20">{children}</main>
            <Footer />
            <Toaster />
          </ClientProviders>
        </AlephiumWalletProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
