"use client"

import { type ReactNode, useEffect, useState } from "react"
import { WalletProvider } from "@/hooks/use-wallet"

export function ClientProviders({ children }: { children: ReactNode }) {
  // Use a state to control rendering on the client side
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR, just render children without any client-side logic
  if (!mounted) {
    return <>{children}</>
  }

  // Once mounted on the client, wrap with our custom wallet provider
  return <WalletProvider>{children}</WalletProvider>
}
