import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from "@/components/ui/toaster"
import { AlephiumWalletProvider } from "@alephium/web3-react"
import { BalanceProvider } from "@/components/balance-provider"
import { LenisProvider } from "@/components/lenis-provider"

const inter = Inter({ subsets: ["latin"] })

// Define metadata BEFORE the layout component
export const metadata = {
  title: {
    template: '%s | YUM',
    default: 'YUM - Alephium DeFi Platform',
  },
  description: 'YUM: Your gateway to decentralized finance on the Alephium blockchain. Explore token swaps, banking, mutual funding, and more.',
  openGraph: {
    title: 'YUM - Alephium DeFi Platform',
    description: 'Decentralized finance on Alephium: Swap, Bank, Fund.',
    // Add a URL to your main logo image here
    // images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://accalyum.xyz'}/images/og-logo.png`], 
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://accalyum.xyz',
    siteName: 'YUM',
    locale: 'en_US',
    type: 'website',
  },
  // Add Twitter card tags if desired
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'YUM - Alephium DeFi Platform',
  //   description: 'Decentralized finance on Alephium: Swap, Bank, Fund.',
  //   images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://accalyum.xyz'}/images/twitter-logo.png`], 
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LenisProvider>
          <AlephiumWalletProvider network="mainnet">
            <BalanceProvider>
              <LanguageProvider>{children}</LanguageProvider>
            </BalanceProvider>
          </AlephiumWalletProvider>
          <Toaster />
        </LenisProvider>
      </body>
    </html>
  )
}
