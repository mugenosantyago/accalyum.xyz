import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from "@/components/ui/toaster"
import { AlephiumWalletProvider } from "@alephium/web3-react"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AlephiumWalletProvider network="mainnet">
          <LanguageProvider>{children}</LanguageProvider>
        </AlephiumWalletProvider>
        <Toaster />
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
