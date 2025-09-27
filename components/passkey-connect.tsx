"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Smartphone, Key, AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { config } from "@/lib/config"

interface PasskeyConnectProps {
  onConnect?: (credential: any) => void
  className?: string
}

export function PasskeyConnect({ onConnect, className = "" }: PasskeyConnectProps) {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePasskeyConnect = async () => {
    if (!config.alephium.enablePasskeys) {
      setError("Passkey authentication is not enabled yet")
      return
    }

    if (!window.PublicKeyCredential) {
      setError("Passkeys are not supported in this browser")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check if WebAuthn is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      
      if (!available) {
        throw new Error("No biometric authenticator available")
      }

      // Create credential request
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            name: "YUM Network",
            id: window.location.hostname,
          },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: "YUM User",
            displayName: "YUM User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      })

      if (credential && onConnect) {
        onConnect(credential)
      }
    } catch (err) {
      console.error("Passkey authentication failed:", err)
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (!config.alephium.enablePasskeys) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Passkey Authentication</CardTitle>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
          <CardDescription>
            Secure, passwordless authentication using biometrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <Smartphone className="h-8 w-8 text-blue-500 mb-2" />
              <span className="text-sm font-medium">Face ID</span>
              <span className="text-xs text-muted-foreground">iOS devices</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <Shield className="h-8 w-8 text-green-500 mb-2" />
              <span className="text-sm font-medium">Touch ID</span>
              <span className="text-xs text-muted-foreground">Fingerprint</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <Key className="h-8 w-8 text-purple-500 mb-2" />
              <span className="text-sm font-medium">YubiKey</span>
              <span className="text-xs text-muted-foreground">Hardware key</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Danube Feature Preview
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Passkey authentication will allow you to connect your wallet using biometrics instead of seed phrases, making Web3 as easy as unlocking your phone.
              </p>
            </div>
          </div>

          <Button 
            disabled 
            variant="outline" 
            className="w-full"
          >
            <Shield className="h-4 w-4 mr-2" />
            Available Soon
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Passkey Authentication</CardTitle>
          <Badge variant="default">Live</Badge>
        </div>
        <CardDescription>
          Connect securely using Face ID, Touch ID, or hardware keys
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        <Button 
          onClick={handlePasskeyConnect}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
              Authenticating...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Connect with Passkey
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
