"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Heart } from "lucide-react"
import { config } from "@/lib/config"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/components/language-provider"
import { formatAlphBalance } from "@/lib/alephium-utils"
import { NodeProvider } from "@alephium/web3"
import { AlephiumConnectButton } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletAwareWrapper } from "@/components/wallet-aware-wrapper"
import { ConnectionSuccessModal } from "@/components/connection-success-modal"
import { checkAlephiumConnection } from "@/lib/wallet-utils"

interface Initiative {
  id: string
  name: string
  description: string
  treasuryAddress: string
  goal: string
  raised: string
  image: string
  loading: boolean
}

export default function MutualFundingPage() {
  const { t } = useLanguage()
  const [donationAmount, setDonationAmount] = useState("")
  const [selectedInitiative, setSelectedInitiative] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Alephium connection state
  const [directAlephiumConnection, setDirectAlephiumConnection] = useState({
    connected: false,
    address: ""
  })

  // Force check connection when component mounts
  useEffect(() => {
    // Check Alephium extension
    const checkAlephiumExtension = async () => {
      try {
        const { connected, address } = await checkAlephiumConnection()
        if (connected && address) {
          console.log("Direct Alephium extension connection found:", address)
          setDirectAlephiumConnection({
            connected: true,
            address
          })
        }
      } catch (error) {
        console.error("Error checking Alephium extension:", error)
      }
    }
    
    checkAlephiumExtension()
    
    // Also listen for Alephium's account changes
    const handleAccountsChanged = () => {
      console.log("Accounts changed, rechecking Alephium connection")
      checkAlephiumExtension()
    }
    
    if (typeof window !== "undefined" && window.alephium && window.alephium.on) {
      try {
        window.alephium.on("accountsChanged", handleAccountsChanged)
      } catch (error) {
        console.error("Error setting up Alephium event listener:", error)
      }
    }
    
    return () => {
      if (typeof window !== "undefined" && window.alephium && window.alephium.off) {
        try {
          window.alephium.off("accountsChanged", handleAccountsChanged)
        } catch (error) {
          console.error("Error removing Alephium event listener:", error)
        }
      }
    }
  }, [])

  // Get the effective connected state
  const effectiveIsConnected = directAlephiumConnection.connected
  const effectiveAddress = directAlephiumConnection.address

  // Initialize initiatives with loading state
  useEffect(() => {
    const initialInitiatives: Initiative[] = [
      {
        id: "homelessness",
        name: "Homelessness Relief Initiative",
        description: "Supporting homeless communities with resources, shelter, and sustainable solutions.",
        treasuryAddress: config.treasury.homelessness,
        goal: "5000",
        raised: "0",
        image: "/infrastructure-image.jpeg",
        loading: true,
      },
      {
        id: "palestine",
        name: "Palestine Solidarity Fund",
        description: "Providing humanitarian aid and support to Palestinian communities in need.",
        treasuryAddress: config.treasury.palestine,
        goal: "8000",
        raised: "0",
        image: "/gaza-image.jpeg",
        loading: true,
      },
      {
        id: "communist",
        name: "Communist Infrastructure and Security",
        description:
          "Building infrastructure, transportation networks, and security systems for socialist communities.",
        treasuryAddress: config.treasury.communist,
        goal: "3000",
        raised: "0",
        image: "/communist-infrastructure.jpg",
        loading: true,
      },
    ]

    setInitiatives(initialInitiatives)
    fetchTreasuryBalances(initialInitiatives)
  }, [])

  // Fetch real balances from the blockchain
  const fetchTreasuryBalances = async (initiatives: Initiative[]) => {
    setIsLoading(true)

    try {
      const nodeProvider = new NodeProvider(config.alephium.providerUrl)

      // Create a copy of initiatives to update
      const updatedInitiatives = [...initiatives]

      // Fetch balances for each initiative
      for (let i = 0; i < updatedInitiatives.length; i++) {
        const initiative = updatedInitiatives[i]

        try {
          console.log(`Fetching balance for ${initiative.name} at address ${initiative.treasuryAddress}`)
          const balanceInfo = await nodeProvider.addresses.getAddressesAddressBalance(initiative.treasuryAddress)

          // Convert balance from wei to ALPH (1 ALPH = 10^18 wei)
          const balanceInAlph = formatAlphBalance(balanceInfo.balance)
          console.log(`Balance for ${initiative.name}: ${balanceInAlph} ALPH`)

          // Update the initiative with the real balance
          updatedInitiatives[i] = {
            ...initiative,
            raised: balanceInAlph,
            loading: false,
          }
        } catch (error) {
          console.error(`Error fetching balance for ${initiative.name}:`, error)
          // Keep the initiative but mark as not loading
          updatedInitiatives[i] = {
            ...initiative,
            loading: false,
          }
        }
      }

      // Update state with the fetched balances
      setInitiatives(updatedInitiatives)
    } catch (error) {
      console.error("Error initializing node provider:", error)
      // Mark all initiatives as not loading
      setInitiatives(
        initiatives.map((initiative) => ({
          ...initiative,
          loading: false,
        })),
      )

      toast({
        title: "Error",
        description: "Failed to fetch treasury balances. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveIsConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    if (!selectedInitiative) {
      toast({
        title: "No initiative selected",
        description: "Please select an initiative to donate to",
        variant: "destructive",
      })
      return
    }

    if (!donationAmount || Number.parseFloat(donationAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Get the selected initiative
      const initiative = initiatives.find((i) => i.id === selectedInitiative)

      if (!initiative) {
        throw new Error("Initiative not found")
      }

      // In a real implementation, this would call a server action to process the donation
      // For now, we'll simulate a successful donation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Record the transaction in the database
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: effectiveAddress,
          to: initiative.treasuryAddress,
          amount: donationAmount,
          type: "donation",
          initiative: initiative.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to record transaction")
      }

      setDonationAmount("")
      setSelectedInitiative(null)

      toast({
        title: "Donation successful!",
        description: `Thank you for donating ${donationAmount} ALPH to ${initiative.name}`,
        variant: "default",
      })

      // Refresh balances after donation
      fetchTreasuryBalances(initiatives)
    } catch (error) {
      console.error("Donation error:", error)
      toast({
        title: "Donation failed",
        description: "There was an error processing your donation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("mutualFunding")}</h1>

          <ConnectionSuccessModal featureName="Mutual Funding" />

          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t("activeInitiatives")}</h2>
              <p className="text-gray-600 mb-6">{t("supportCommunity")}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {initiatives.map((initiative) => (
                  <Card
                    key={initiative.id}
                    className={`cursor-pointer transition-all ${
                      selectedInitiative === initiative.id ? "ring-2 ring-[#FF6B35]" : ""
                    }`}
                    onClick={() => setSelectedInitiative(initiative.id)}
                  >
                    <img
                      src={initiative.image || "/placeholder.svg"}
                      alt={initiative.name}
                      className="w-full h-40 object-cover"
                    />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{initiative.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{initiative.description}</p>
                      <div className="space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-[#FF6B35] h-2.5 rounded-full"
                            style={{
                              width: `${Math.min((Number.parseFloat(initiative.raised) / Number.parseFloat(initiative.goal)) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          {initiative.loading ? (
                            <span className="flex items-center">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Loading...
                            </span>
                          ) : (
                            <span>{initiative.raised} ALPH raised</span>
                          )}
                          <span>Goal: {initiative.goal} ALPH</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("makeADonation")}</CardTitle>
                <CardDescription>{t("supportInitiative")}</CardDescription>
              </CardHeader>

              <CardContent>
                <WalletAwareWrapper
                  fallback={
                    <div className="text-center py-6">
                      <p className="mb-4 text-amber-600">{t("accessDonationFeatures")}</p>
                      <AlephiumConnectButton />
                    </div>
                  }
                >
                  {({ isConnected, address }) =>
                    effectiveIsConnected && effectiveAddress ? (
                      <form onSubmit={handleDonate} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="project">{t("selectedInitiative")}</Label>
                          <div className="p-3 bg-gray-50 rounded-md">
                            {selectedInitiative ? (
                              <p className="font-medium">
                                {initiatives.find((i) => i.id === selectedInitiative)?.name}
                              </p>
                            ) : (
                              <p className="text-gray-500">{t("pleaseSelectInitiative")}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="donationAmount">{t("donationAmount")} (ALPH)</Label>
                          <Input
                            id="donationAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={donationAmount}
                            onChange={(e) => setDonationAmount(e.target.value)}
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                          disabled={isProcessing || !selectedInitiative}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("processing")}
                            </>
                          ) : (
                            <>
                              <Heart className="mr-2 h-4 w-4" />
                              {t("donate")}
                            </>
                          )}
                        </Button>
                      </form>
                    ) : null
                  }
                </WalletAwareWrapper>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
}
