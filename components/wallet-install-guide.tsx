"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, X } from "lucide-react"
import { isMobileDevice } from "@/lib/utils-mobile"

interface WalletInstallGuideProps {
  onClose?: () => void
}

export function WalletInstallGuide({ onClose }: WalletInstallGuideProps) {
  const isMobile = isMobileDevice()

  return (
    <Card className="w-full max-w-md mx-auto border border-[#FF6B35] bg-gray-900 text-white shadow-lg shadow-[#FF6B35]/20">
      <CardHeader className="relative">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 text-gray-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <CardTitle className="text-[#FF6B35]">Wallet Required</CardTitle>
        <CardDescription className="text-gray-300">
          To interact with the Alephium blockchain, you need to install a wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMobile ? (
          <>
            <div className="space-y-2">
              <h3 className="font-medium text-[#FF6B35]">Mobile Options:</h3>
              <p className="text-sm text-gray-300">Download the official Alephium mobile wallet app:</p>
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10"
                  onClick={() =>
                    window.open("https://play.google.com/store/apps/details?id=org.alephium.wallet", "_blank")
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Android App
                </Button>
                <Button
                  variant="outline"
                  className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10"
                  onClick={() => window.open("https://apps.apple.com/app/alephium-wallet/id6450268321", "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  iOS App
                </Button>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm text-gray-300">You can also use any WalletConnect compatible wallet.</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h3 className="font-medium text-[#FF6B35]">Browser Extension:</h3>
              <p className="text-sm text-gray-300">Install the Alephium Wallet browser extension:</p>
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10"
                  onClick={() =>
                    window.open(
                      "https://chrome.google.com/webstore/detail/alephium-extension-wallet/gdokollfhmnbfckbobkdbakhilldkhcj",
                      "_blank",
                    )
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Chrome Extension
                </Button>
                <Button
                  variant="outline"
                  className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10"
                  onClick={() =>
                    window.open("https://addons.mozilla.org/en-US/firefox/addon/alephium-extension-wallet/", "_blank")
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Firefox Extension
                </Button>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm text-gray-300">
                After installing, create or import a wallet and refresh this page.
              </p>
            </div>
          </>
        )}
      </CardContent>
      {onClose && (
        <CardFooter>
          <Button className="w-full bg-[#FF6B35] hover:bg-[#E85A2A] text-white" onClick={onClose}>
            I'll install it later
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
