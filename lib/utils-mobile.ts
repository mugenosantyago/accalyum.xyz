// Detect if the user is on a mobile device
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Detect iOS devices
export function isIOS(): boolean {
  if (typeof window === "undefined") return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// Detect Android devices
export function isAndroid(): boolean {
  if (typeof window === "undefined") return false
  return /Android/i.test(navigator.userAgent)
}

export function handleMobileWalletConnection(uri: string): void {
  if (!isMobileDevice()) return

  // Try to detect common wallet apps and open them with the WalletConnect URI
  const hasOpened = tryOpenWalletApp(uri)

  if (!hasOpened) {
    // If no specific wallet app was detected, try a generic deep link
    // Add a small delay to ensure the QR code is visible first
    setTimeout(() => {
      window.location.href = uri
    }, 500)
  }
}

function tryOpenWalletApp(uri: string): boolean {
  // List of common wallet apps and their deep link formats
  const walletApps = [
    { name: "alephium", deepLink: (uri: string) => `alephium://wc?uri=${encodeURIComponent(uri)}` },
    { name: "metamask", deepLink: (uri: string) => `metamask://wc?uri=${encodeURIComponent(uri)}` },
    { name: "trust", deepLink: (uri: string) => `trust://wc?uri=${encodeURIComponent(uri)}` },
    { name: "rainbow", deepLink: (uri: string) => `rainbow://wc?uri=${encodeURIComponent(uri)}` },
    // Add more wallet apps as needed
  ]

  // Try to detect installed apps based on platform
  if (isIOS()) {
    // iOS specific handling
    for (const app of walletApps) {
      try {
        window.location.href = app.deepLink(uri)
        return true
      } catch (e) {
        console.warn(`Failed to open ${app.name} wallet:`, e)
      }
    }
  } else if (isAndroid()) {
    // Android specific handling
    for (const app of walletApps) {
      try {
        window.location.href = app.deepLink(uri)
        return true
      } catch (e) {
        console.warn(`Failed to open ${app.name} wallet:`, e)
      }
    }
  }

  return false
}

// Get appropriate app store links based on platform
export function getWalletAppStoreLink(): string {
  if (isIOS()) {
    return "https://apps.apple.com/app/alephium-wallet/id6450268321"
  } else if (isAndroid()) {
    return "https://play.google.com/store/apps/details?id=org.alephium.wallet"
  }
  return "https://wallet.alephium.org"
}

// Get browser extension links based on browser
export function getWalletExtensionLink(): string {
  if (typeof window === "undefined") return "https://wallet.alephium.org"

  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes("firefox")) {
    return "https://addons.mozilla.org/en-US/firefox/addon/alephium-extension-wallet/"
  } else if (userAgent.includes("edg")) {
    return "https://microsoftedge.microsoft.com/addons/detail/alephium-extension-wallet/gdokollfhmnbfckbobkdbakhilldkhcj"
  } else {
    // Default to Chrome
    return "https://chrome.google.com/webstore/detail/alephium-extension-wallet/gdokollfhmnbfckbobkdbakhilldkhcj"
  }
}
