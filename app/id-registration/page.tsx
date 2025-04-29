"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/components/language-provider"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { useWallet } from "@/hooks/use-wallet"
import { AlephiumConnectButton } from "@/components/alephium-connect-button"

// Political parties array
const politicalParties = [
  { label: "Party for Socialism and Liberation (PSL)", value: "PSL" },
  { label: "Democratic Socialists of America (DSA)", value: "DSA" },
  { label: "American Communist Party (ACP)", value: "ACP" },
  { label: "Green Party (GREEN)", value: "GREEN" },
  { label: "Revolutionary Communist Party (RCP)", value: "RCP" },
  { label: "Socialist Equality Party (SEP)", value: "SEP" },
  { label: "Socialist Workers Party (SWP)", value: "SWP" },
  { label: "Communist Party USA (CPUSA)", value: "CPUSA" },
  { label: "African People's Socialist Party (APSP)", value: "APSP" },
  { label: "All-African People's Revolutionary Party (A-APRP)", value: "A-APRP" },
  { label: "New Afrikan Black Panther Party (NABPP)", value: "NABPP" },
  { label: "Workers World Party (WWP)", value: "WWP" },
  { label: "The Irish Republican Socialist Committees of North America (IRSCNA)", value: "IRSCNA" },
  { label: "Palestinian Youth Movement (PYM)", value: "PYM" },
  { label: "Japanese Communist Party (JCP)", value: "JCP" },
]

export default function IDRegistrationPage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const { isConnected, address } = useWallet()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [addressDigits, setAddressDigits] = useState("")
  const [selectedParties, setSelectedParties] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handlePartyChange = (value: string, checked: boolean) => {
    if (checked) {
      if (selectedParties.length < 3) {
        setSelectedParties([...selectedParties, value])
      } else {
        toast({
          title: "Maximum selections reached",
          description: "You can only select up to 3 political parties",
          variant: "destructive",
        })
      }
    } else {
      setSelectedParties(selectedParties.filter((party) => party !== value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    // Validate required fields
    if (!username || !email || !firstName || !lastName || !addressDigits) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate address digits format (5 digits)
    if (!/^\d{5}$/.test(addressDigits)) {
      toast({
        title: "Invalid address format",
        description: "Please enter the first 5 digits of your address",
        variant: "destructive",
      })
      return
    }

    // Validate at least one party is selected
    if (selectedParties.length === 0) {
      toast({
        title: "Party selection required",
        description: "Please select at least one political party",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Submit registration to API
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          address: address,
          firstName,
          lastName,
          addressDigits,
          politicalParties: selectedParties,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      if (data.status === "pending") {
        setIsPending(true)
        toast({
          title: "Registration submitted",
          description: "Your registration is pending admin approval. You will be notified by email.",
          variant: "default",
        })
      } else {
        setIsRegistered(true)
        toast({
          title: "Registration successful",
          description: "Your ACYUM ID has been created.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("idRegistration")}</h1>

          <div className="max-w-md mx-auto">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>{t("registerYourAcyumId")}</CardTitle>
                <CardDescription className="text-gray-400">{t("connectWalletCreateIdentity")}</CardDescription>
              </CardHeader>

              {isRegistered ? (
                <CardContent>
                  <div className="bg-green-900 p-4 rounded-md border border-green-700 text-green-100 mb-4">
                    <p className="font-medium">Registration Successful!</p>
                    <p className="text-sm mt-1">Your ACYUM ID has been created and linked to your wallet address.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">{t("username")}</Label>
                      <p className="text-gray-100 font-medium">{username}</p>
                    </div>

                    <div>
                      <Label className="text-gray-300">{t("email")}</Label>
                      <p className="text-gray-100 font-medium">{email}</p>
                    </div>

                    <div>
                      <Label className="text-gray-300">{t("walletAddress")}</Label>
                      <p className="text-gray-100 font-medium text-sm break-all">{address}</p>
                    </div>
                  </div>
                </CardContent>
              ) : isPending ? (
                <CardContent>
                  <div className="bg-yellow-900 p-4 rounded-md border border-yellow-700 text-yellow-100 mb-4">
                    <p className="font-medium">Registration Pending Approval</p>
                    <p className="text-sm mt-1">
                      Your registration has been submitted and is pending admin approval. You will be notified by email
                      when your ACYUM ID is ready.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">{t("username")}</Label>
                      <p className="text-gray-100 font-medium">{username}</p>
                    </div>

                    <div>
                      <Label className="text-gray-300">{t("email")}</Label>
                      <p className="text-gray-100 font-medium">{email}</p>
                    </div>

                    <div>
                      <Label className="text-gray-300">{t("walletAddress")}</Label>
                      <p className="text-gray-100 font-medium text-sm break-all">{address}</p>
                    </div>
                  </div>
                </CardContent>
              ) : !isConnected ? (
                <CardContent className="text-center py-6">
                  <p className="mb-4 text-amber-600">{t("connectWalletFirst")}</p>
                  <AlephiumConnectButton />
                </CardContent>
              ) : (
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-300">
                        {t("username")}
                      </Label>
                      <Input
                        id="username"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        {t("email")}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-gray-300">
                          {t("firstName")}
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-gray-300">
                          {t("lastName")}
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressDigits" className="text-gray-300">
                        {t("first5DigitsOfAddress")}
                      </Label>
                      <Input
                        id="addressDigits"
                        placeholder="e.g. 12345"
                        value={addressDigits}
                        onChange={(e) => setAddressDigits(e.target.value)}
                        maxLength={5}
                        pattern="\d{5}"
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                      <p className="text-xs text-gray-400">{t("enterFirst5Digits")}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">{t("walletAddress")}</Label>
                      <Input value={address || "-"} className="bg-gray-800 border-gray-700" readOnly />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-gray-300">{t("politicalParties")}</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 bg-gray-800 p-3 rounded-md border border-gray-700">
                        {politicalParties.map((party) => (
                          <div key={party.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`party-${party.value}`}
                              checked={selectedParties.includes(party.value)}
                              onCheckedChange={(checked) => handlePartyChange(party.value, checked === true)}
                              className="border-gray-600 data-[state=checked]:bg-[#FF6B35] data-[state=checked]:border-[#FF6B35]"
                            />
                            <Label htmlFor={`party-${party.value}`} className="text-sm text-gray-300 cursor-pointer">
                              {party.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        {selectedParties.length === 0
                          ? t("selectAtLeastOne")
                          : `${t("selected")}: ${selectedParties.length}/3`}
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                      disabled={!isConnected || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("registering")}
                        </>
                      ) : (
                        t("register")
                      )}
                    </Button>
                  </CardFooter>
                </form>
              )}
            </Card>
          </div>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
}
