"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, Shield, User, Link as LinkIcon, Cpu } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { config } from "@/lib/config"

export function DanubeFeatures() {
  const { t } = useLanguage()

  const features = [
    {
      icon: <Clock className="h-8 w-8 text-blue-500" />,
      title: "Ultra-Fast Block Times",
      description: "8-second block confirmations - 2x faster than before",
      benefit: "Lightning-fast transactions",
      technical: `${config.alephium.fastBlockTime / 1000}s blocks`,
      status: "active"
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      title: "Massive Throughput",
      description: "Over 20,000 transactions per second capacity",
      benefit: "Scale for global adoption",
      technical: `${config.alephium.maxTxPerSecond.toLocaleString()}+ TPS`,
      status: "active"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-500" />,
      title: "Invisible Sharding",
      description: "Groupless addresses eliminate complexity",
      benefit: "Seamless user experience",
      technical: "Auto-sharding",
      status: "active"
    },
    {
      icon: <User className="h-8 w-8 text-purple-500" />,
      title: "Passkey Authentication",
      description: "Login with Face ID, Touch ID, or YubiKey",
      benefit: "No seed phrases needed",
      technical: "WebAuthn",
      status: config.alephium.enablePasskeys ? "active" : "coming-soon"
    },
    {
      icon: <LinkIcon className="h-8 w-8 text-indigo-500" />,
      title: "Chained Transactions",
      description: "Multiple operations in a single transaction",
      benefit: "Complex DeFi in one call",
      technical: "TxScript",
      status: "active"
    },
    {
      icon: <Cpu className="h-8 w-8 text-red-500" />,
      title: "Enhanced VM",
      description: "I256 operations, auto dust handling",
      benefit: "Better developer experience",
      technical: "Ralph v2",
      status: "active"
    }
  ]

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <Badge variant="secondary" className="mb-4 text-lg px-4 py-2">
          🚀 Danube Upgrade Active
        </Badge>
        <h2 className="text-3xl font-bold mb-4">
          Next-Generation Blockchain Features
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Experience the power of Alephium's Danube upgrade with revolutionary improvements
          in speed, scalability, and user experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {feature.icon}
                  <Badge 
                    variant={feature.status === "active" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {feature.status === "active" ? "Live" : "Coming Soon"}
                  </Badge>
                </div>
                <div className="text-right text-sm font-mono text-muted-foreground">
                  {feature.technical}
                </div>
              </div>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base mb-3">
                {feature.description}
              </CardDescription>
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                {feature.benefit}
              </div>
            </CardContent>
            
            {feature.status === "active" && (
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-green-500/20 to-transparent rounded-bl-3xl"></div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-3">Network Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                8s
              </div>
              <div className="text-sm text-muted-foreground">Block Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                20k+
              </div>
              <div className="text-sm text-muted-foreground">TPS Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                3x
              </div>
              <div className="text-sm text-muted-foreground">Sync Speed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                ∞
              </div>
              <div className="text-sm text-muted-foreground">Scalability</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Danube upgrade activated July 15, 2025 • Powered by Alephium's BlockFlow consensus
        </p>
      </div>
    </div>
  )
}
