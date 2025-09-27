import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { DanubeFeatures } from "@/components/danube-features"
import { PasskeyConnect } from "@/components/passkey-connect"
import type { Metadata } from 'next'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, ExternalLink } from "lucide-react"
import Link from "next/link"

// Add metadata for the Danube page
export const metadata: Metadata = {
  title: 'Danube Upgrade Features - Revolutionary Blockchain Technology',
  description: 'Discover Alephium\'s Danube upgrade features: 8-second blocks, 20k+ TPS, groupless addresses, passkey authentication, and enhanced smart contracts. The future of Web3 is here.',
  keywords: ['Danube', 'Alephium', 'blockchain', 'Web3', '8-second blocks', '20k TPS', 'groupless addresses', 'passkeys', 'DeFi'],
  openGraph: {
    title: 'Experience the Danube Revolution',
    description: 'Lightning-fast transactions, seamless UX, and revolutionary features on Alephium\'s upgraded network.',
    type: 'website',
  }
};

export default function DanubePage() {
  return (
    <ClientLayoutWrapper>
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-lg px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
              🚀 Danube Upgrade Active Since July 15, 2025
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              The Future of Blockchain is Here
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Experience Alephium's revolutionary Danube upgrade: faster confirmations, 
              massive throughput, and seamless user experience that makes Web3 accessible to everyone.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-md">
                <span className="text-2xl">⚡</span>
                <span className="font-semibold">8s Blocks</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-md">
                <span className="text-2xl">🚀</span>
                <span className="font-semibold">20k+ TPS</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-md">
                <span className="text-2xl">🔗</span>
                <span className="font-semibold">Groupless</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-md">
                <span className="text-2xl">🔐</span>
                <span className="font-semibold">Passkeys</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 group"
              >
                Experience Danube Now
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="https://docs.alephium.org/ralph/danube-features"
                target="_blank"
                className="inline-flex items-center px-8 py-4 rounded-lg border border-primary text-primary font-medium text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                Technical Documentation
                <ExternalLink className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Main Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <DanubeFeatures />
          </div>
        </section>

        {/* Passkey Preview Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950/50 dark:to-blue-950/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Revolutionary Authentication</h2>
              <p className="text-lg text-muted-foreground">
                Say goodbye to seed phrases. Hello to Face ID, Touch ID, and hardware keys.
              </p>
            </div>
            <PasskeyConnect className="max-w-2xl mx-auto" />
          </div>
        </section>

        {/* Technical Deep Dive */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Technical Excellence</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⛓️</span>
                    BlockFlow Consensus
                  </CardTitle>
                  <CardDescription>
                    Advanced sharding with invisible complexity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Automatic shard management
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      No user-facing complexity
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Linear scalability
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      3x faster sync speeds
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">💻</span>
                    Enhanced Ralph VM
                  </CardTitle>
                  <CardDescription>
                    Next-generation smart contract execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      I256 bitwise operations
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Automatic dust handling
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Chained contract calls
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Gas optimizations
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Experience the Future?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of users already enjoying lightning-fast transactions and seamless DeFi experiences.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/nightshade-swap"
                className="inline-flex items-center px-8 py-4 rounded-lg bg-white text-blue-600 font-medium text-lg hover:bg-gray-100 transition-all duration-300 group"
              >
                Try Token Swaps
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/yum-fund"
                className="inline-flex items-center px-8 py-4 rounded-lg border-2 border-white text-white font-medium text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                Explore YUM Fund
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ClientLayoutWrapper>
  )
}
