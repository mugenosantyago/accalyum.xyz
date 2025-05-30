import { NodeProvider } from "@alephium/web3"
import { config } from "@/lib/config"
import makeDepositJson from "../contracts/make-deposit-json"
import withdrawJson from "../contracts/withdraw-json"
// Add import for AlephiumUtils at the top of the file
import { AlephiumUtils } from "@/lib/alephium-utils"

interface WalletConnectConfig {
  projectId: string
  metadata: {
    name: string
    description: string
    url: string
    icons: string[]
  }
}

interface SignMessageParams {
  address: string
  message: string
  signature: string
}

interface TokenBalance {
  id: string
  amount: string
}

interface AddressBalance {
  balance: string
  tokenBalances?: TokenBalance[] | Record<string, string>
  lockedBalances?: Array<{
    tokens?: Record<string, string>
  }>
}

interface AlephiumProvider {
  enable: () => Promise<any>
  isConnected: () => Promise<boolean>
  getSelectedAccount: () => Promise<string>
  signAndSubmitTransferTx: (params: any) => Promise<any>
  signAndSubmitDeployContractTx: (params: any) => Promise<any>
  signAndSubmitExecuteScriptTx: (params: any) => Promise<any>
  signUnsignedTx: (unsignedTx: any) => Promise<any>
  signMessage: (message: string) => Promise<any>
  getBalance: () => Promise<any>
  getAddresses: () => Promise<string[]>
  buildTransferTx: (params: any) => Promise<any>
  buildDeployContractTx: (params: any) => Promise<any>
  buildExecuteScriptTx: (params: any) => Promise<any>
  getNetwork: () => Promise<string>
  switchNetwork: (network: string) => Promise<void>
  on: (event: string, callback: (data: any) => void) => void
  off: (event: string, callback: (data: any) => void) => void
}

declare global {
  interface Window {
    alephium?: AlephiumProvider
  }
}

export enum ConnectionMethod {
  Extension = "extension",
  WalletConnect = "walletconnect",
  None = "none",
}

export class AlephiumWeb3 {
  private static instance: AlephiumWeb3
  private nodeProvider: NodeProvider | null = null
  private provider: AlephiumProvider | null = null
  private connectionMethod: ConnectionMethod = ConnectionMethod.None
  private isInitializing = false
  private initPromise: Promise<{ nodeProvider: NodeProvider; web3: AlephiumWeb3 }> | null = null
  private connectedAddress: string | null = null
  private networkName: string | null = null

  private constructor() {
    // Defer initialization to the initialize method
  }

  public static getInstance(): AlephiumWeb3 {
    if (!AlephiumWeb3.instance) {
      AlephiumWeb3.instance = new AlephiumWeb3()
    }
    return AlephiumWeb3.instance
  }

  public static async initialize(forceRefresh = false) {
    const instance = this.getInstance()

    // Return existing initialization if in progress
    if (instance.initPromise && !forceRefresh) {
      return instance.initPromise
    }

    // Prevent multiple simultaneous initializations
    if (instance.isInitializing) {
      throw new Error("Initialization already in progress")
    }

    instance.isInitializing = true

    instance.initPromise = new Promise(async (resolve, reject) => {
      try {
        // Initialize node provider
        if (!instance.nodeProvider || forceRefresh) {
          if (!config.alephium.providerUrl) {
            throw new Error("Alephium provider URL is not configured.");
          }
          instance.nodeProvider = new NodeProvider(config.alephium.providerUrl)

          // Configure WalletConnect if project ID is available and the method exists
          if (config.alephium.walletConnectProjectId) {
            try {
              // Check if the method exists before calling it
              if (instance.nodeProvider && typeof instance.nodeProvider.setWalletConnectConfig === "function") {
                instance.setWalletConnectConfig({
                  projectId: config.alephium.walletConnectProjectId,
                  metadata: {
                    name: "ACYUM Network",
                    description: "ACYUM Network dApp",
                    url: typeof window !== "undefined" ? window.location.origin : "https://accalyum.xyz",
                    icons: ["https://accalyum.xyz/images/logo.png"],
                  },
                })
              } else {
                console.warn("WalletConnect configuration is not supported in this version of the Alephium library")
              }
            } catch (error) {
              console.warn("Failed to configure WalletConnect:", error)
              // Continue initialization even if WalletConnect configuration fails
            }
          }
        }

        // Try to restore previous connection
        await instance.tryRestoreConnection()

        instance.isInitializing = false
        resolve({ nodeProvider: instance.nodeProvider, web3: instance })
      } catch (error) {
        instance.isInitializing = false
        console.error("Failed to initialize Alephium Web3:", error)
        reject(error)
      }
    })

    return instance.initPromise
  }

  private async tryRestoreConnection(): Promise<boolean> {
    try {
      // Try to restore extension connection
      if (typeof window !== "undefined" && window.alephium) {
        const isConnected = await window.alephium.isConnected().catch(() => false)
        if (isConnected) {
          const address = await window.alephium.getSelectedAccount().catch(() => null)
          if (address) {
            this.provider = window.alephium
            this.connectionMethod = ConnectionMethod.Extension
            this.connectedAddress = address

            // Get network
            try {
              this.networkName = await window.alephium.getNetwork()
              this.validateNetwork()
            } catch (e) {
              console.warn("Could not get network from extension:", e)
            }

            return true
          }
        }
      }

      // WalletConnect restoration would go here if needed

      return false
    } catch (error) {
      console.warn("Failed to restore connection:", error)
      return false
    }
  }

  private validateNetwork(): void {
    if (this.networkName && this.networkName !== config.alephium.network) {
      console.warn(`Network mismatch: Connected to ${this.networkName} but expected ${config.alephium.network}`)
      // We don't throw here to avoid breaking the connection, but we should warn the user
    }
  }

  public static async getConnectedWallet(): Promise<{ address: string; method: ConnectionMethod } | null> {
    try {
      const instance = this.getInstance()

      if (instance.connectedAddress && instance.connectionMethod !== ConnectionMethod.None) {
        return {
          address: instance.connectedAddress,
          method: instance.connectionMethod,
        }
      }

      // Try to restore connection if we don't have one
      if (await instance.tryRestoreConnection()) {
        return {
          address: instance.connectedAddress!,
          method: instance.connectionMethod,
        }
      }

      return null
    } catch (error) {
      console.error("Error checking wallet connection:", error)
      return null
    }
  }

  public async connect(preferredMethod?: ConnectionMethod): Promise<{ address: string; method: ConnectionMethod }> {
    try {
      console.log("Starting wallet connection process with preferred method:", preferredMethod)

      // If already connected, return current connection
      if (this.connectedAddress && this.connectionMethod !== ConnectionMethod.None) {
        return {
          address: this.connectedAddress,
          method: this.connectionMethod,
        }
      }

      // Initialize if not already done
      if (!this.nodeProvider) {
        await AlephiumWeb3.initialize()
      }

      // If WalletConnect is explicitly preferred, try it first
      if (preferredMethod === ConnectionMethod.WalletConnect) {
        console.log("WalletConnect explicitly requested, trying it first")
        const walletConnectResult = await AlephiumWeb3.connectWithWalletConnect()
        if (walletConnectResult) {
          this.connectionMethod = ConnectionMethod.WalletConnect
          this.connectedAddress = walletConnectResult.address
          return {
            address: walletConnectResult.address,
            method: ConnectionMethod.WalletConnect,
          }
        } else {
          console.log("WalletConnect connection failed")
        }
      }

      // Try extension if explicitly requested or if no preference
      if (preferredMethod === ConnectionMethod.Extension || preferredMethod === undefined) {
        // Check if extension is available before trying to connect
        const isExtensionAvailable = await AlephiumWeb3.isExtensionAvailable()

        if (isExtensionAvailable) {
          console.log("Extension available, trying extension connection...")
          try {
            const extensionResult = await AlephiumWeb3.connectToExtension()
            if (extensionResult) {
              this.provider = window.alephium!
              this.connectionMethod = ConnectionMethod.Extension
              this.connectedAddress = extensionResult.address

              // Get network
              try {
                this.networkName = await window.alephium!.getNetwork()
                this.validateNetwork()
              } catch (e) {
                console.warn("Could not get network from extension:", e)
              }

              return {
                address: extensionResult.address,
                method: ConnectionMethod.Extension,
              }
            }
          } catch (error) {
            console.log("Extension connection failed:", error)
            // If extension was explicitly requested, rethrow the error
            if (preferredMethod === ConnectionMethod.Extension) {
              throw error
            }
            // Otherwise fall through to WalletConnect
          }
        } else {
          console.log("Extension not available")
          // If extension was explicitly requested, throw an error
          if (preferredMethod === ConnectionMethod.Extension) {
            throw new Error("Alephium extension not found. Please make sure it's installed and enabled.")
          }
          // Otherwise fall through to WalletConnect
        }
      }

      // If extension failed or wasn't available and we didn't already try WalletConnect, try it now
      if (preferredMethod !== ConnectionMethod.WalletConnect) {
        console.log("Trying WalletConnect connection...")
        const walletConnectResult = await AlephiumWeb3.connectWithWalletConnect()
        if (walletConnectResult) {
          this.connectionMethod = ConnectionMethod.WalletConnect
          this.connectedAddress = walletConnectResult.address
          return {
            address: walletConnectResult.address,
            method: ConnectionMethod.WalletConnect,
          }
        } else {
          console.log("WalletConnect connection failed")
        }
      }

      throw new Error(
        "No compatible wallet found. Please install Alephium wallet extension or use a WalletConnect compatible wallet.",
      )
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      this.connectionMethod = ConnectionMethod.None
      this.connectedAddress = null
      this.provider = null

      if (error instanceof Error) {
        throw new Error(`Failed to connect wallet: ${error.message}`)
      }
      throw error
    }
  }

  public async verifySignature(params: SignMessageParams): Promise<boolean> {
    if (!this.nodeProvider) {
      throw new Error("Node provider not initialized")
    }

    // Check if the method exists
    if (typeof this.nodeProvider.verifySignature !== "function") {
      console.warn("verifySignature method is not available in this version of the Alephium library")
      return false
    }

    return await this.nodeProvider.verifySignature(params)
  }

  public setWalletConnectConfig(config: WalletConnectConfig): void {
    if (!this.nodeProvider) {
      throw new Error("Node provider not initialized")
    }

    // Check if the method exists
    if (typeof this.nodeProvider.setWalletConnectConfig !== "function") {
      console.warn("setWalletConnectConfig method is not available in this version of the Alephium library")
      return
    }

    this.nodeProvider.setWalletConnectConfig(config)
  }

  public async getAddresses(): Promise<string[]> {
    if (typeof window !== "undefined" && window.alephium) {
      return await window.alephium.getAddresses()
    }
    throw new Error("Alephium wallet not available")
  }

  private static async waitForExtension(timeoutMs = 1000): Promise<boolean> {
    const startTime = Date.now()
    let checkCount = 0

    while (Date.now() - startTime < timeoutMs) {
      checkCount++
      if (typeof window !== "undefined" && window.alephium) {
        try {
          console.log(`Extension found on check #${checkCount}, testing connection...`)
          // Just check if the object exists and has methods
          if (typeof window.alephium.isConnected === "function") {
            console.log("Extension API looks valid")
            return true
          }
          console.log("Extension found but API doesn't look complete, waiting...")
        } catch (error) {
          console.log(`Extension found but not responsive on check #${checkCount}, waiting...`, error)
        }
      } else {
        console.log(`Extension not found on check #${checkCount}, waiting...`)
      }

      // Use shorter intervals for more aggressive checking
      const waitTime = Math.min(100, 50 * checkCount)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    console.log(`Timeout waiting for Alephium extension after ${checkCount} checks`)
    return false
  }

  private static async isExtensionAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false

    // Quick check first
    if (window.alephium && typeof window.alephium.isConnected === "function") {
      console.log("Extension immediately available")
      return true
    }

    console.log("Extension not immediately available, waiting...")
    return await this.waitForExtension()
  }

  private static async connectToExtension(): Promise<{ address: string } | null> {
    try {
      console.log("Checking if Alephium extension is available...")
      const isAvailable = await this.isExtensionAvailable()

      if (!isAvailable || !window.alephium) {
        console.log("Alephium extension not found after waiting")
        throw new Error(
          "Alephium wallet not available. Please make sure the Alephium wallet extension is installed and enabled.",
        )
      }

      console.log("Extension found, enabling...")
      await window.alephium.enable()

      console.log("Checking connection status...")
      const isConnected = await window.alephium.isConnected()

      if (!isConnected) {
        console.log("Failed to connect to Alephium extension")
        throw new Error("Failed to connect to Alephium wallet. Please make sure it's unlocked and try again.")
      }

      console.log("Getting selected account...")
      const address = await window.alephium.getSelectedAccount()
      console.log("Connected to Alephium extension with address:", address)

      return { address }
    } catch (error) {
      console.error("Error connecting to Alephium extension:", error)
      throw error // Re-throw to handle in the UI
    }
  }

  private static async connectWithWalletConnect(): Promise<{ address: string } | null> {
    try {
      const instance = this.getInstance()

      if (!instance.nodeProvider) {
        await this.initialize()
      }

      if (!instance.nodeProvider) {
        throw new Error("Node provider initialization failed")
      }

      console.log("Attempting WalletConnect connection...")

      // Check if the connect method exists
      if (typeof instance.nodeProvider.connect !== "function") {
        console.warn("WalletConnect is not supported in this version of the Alephium library")
        return null
      }

      // Force a new WalletConnect session by clearing any existing one
      if (typeof window !== "undefined" && window.localStorage) {
        // Clear any existing WalletConnect session
        const walletConnectKeys = Object.keys(window.localStorage).filter(
          (key) => key.startsWith("walletconnect") || key.includes("wc@"),
        )

        for (const key of walletConnectKeys) {
          console.log("Clearing existing WalletConnect session:", key)
          window.localStorage.removeItem(key)
        }
      }

      console.log("Calling nodeProvider.connect() to trigger WalletConnect...")
      const provider = await instance.nodeProvider.connect()

      if (!provider) {
        throw new Error("Failed to connect - no signer provider returned")
      }

      console.log("WalletConnect provider obtained, getting addresses...")
      const accounts = await provider.getAddresses()

      if (!accounts || accounts.length === 0) {
        throw new Error("No addresses found in wallet")
      }

      console.log("WalletConnect connected with address:", accounts[0])
      return { address: accounts[0] }
    } catch (error) {
      console.error("Error connecting with WalletConnect:", error)
      return null
    }
  }

  public async getBalance(address: string): Promise<string> {
    try {
      if (!this.nodeProvider) {
        await AlephiumWeb3.initialize()
        if (!this.nodeProvider) {
          throw new Error("Node provider initialization failed")
        }
      }

      // Check if the method exists
      if (
        !this.nodeProvider.addresses ||
        typeof this.nodeProvider.addresses.getAddressesAddressBalance !== "function"
      ) {
        console.warn("getAddressesAddressBalance method is not available in this version of the Alephium library")
        return "0"
      }

      const balance = await this.nodeProvider.addresses.getAddressesAddressBalance(address)
      return balance.balance
    } catch (error) {
      console.error("Failed to get balance:", error)
      if (this.connectionMethod === ConnectionMethod.WalletConnect) {
        console.error("WalletConnect balance fetch error details:", error);
      }
      return "0" // Return 0 instead of throwing to avoid breaking the UI
    }
  }

  public async getAcyumBalance(address: string): Promise<string> {
    try {
      if (!this.nodeProvider) {
        await AlephiumWeb3.initialize()
        if (!this.nodeProvider) {
          throw new Error("Node provider initialization failed")
        }
      }

      // Check if the method exists
      if (
        !this.nodeProvider.addresses ||
        typeof this.nodeProvider.addresses.getAddressesAddressBalance !== "function"
      ) {
        console.warn("getAddressesAddressBalance method is not available in this version of the Alephium library")
        return "0"
      }

      const balance = (await this.nodeProvider.addresses.getAddressesAddressBalance(address)) as AddressBalance

      let acyumBalance = BigInt(0)
      const normalizedTokenId = config.alephium.acyumTokenIdHex.startsWith("0x")
        ? config.alephium.acyumTokenIdHex.slice(2)
        : config.alephium.acyumTokenIdHex

      if (balance.tokenBalances) {
        if (Array.isArray(balance.tokenBalances)) {
          const token = balance.tokenBalances.find(
            (t: TokenBalance) => t.id.toLowerCase() === normalizedTokenId.toLowerCase(),
          )
          if (token) {
            acyumBalance += BigInt(token.amount)
          }
        } else if (normalizedTokenId in balance.tokenBalances) {
          acyumBalance += BigInt(balance.tokenBalances[normalizedTokenId])
        }
      }

      if (balance.lockedBalances) {
        for (const locked of balance.lockedBalances) {
          if (locked.tokens && normalizedTokenId in locked.tokens) {
            acyumBalance += BigInt(locked.tokens[normalizedTokenId])
          }
        }
      }

      return acyumBalance.toString()
    } catch (error) {
      console.error("Error fetching ACYUM balance:", error)
      return "0"
    }
  }

  // Update the transfer method to validate addresses
  public async transfer(to: string, amount: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error("Wallet not connected")
    }

    if (!this.provider && typeof window !== "undefined" && window.alephium) {
      this.provider = window.alephium
    }

    if (!this.provider) {
      throw new Error("No provider available")
    }

    // Validate recipient address
    const addressValidation = AlephiumUtils.validateAddress(to)
    if (!addressValidation.isValid) {
      throw new Error("Invalid recipient address")
    }

    // Don't allow transfers to contract addresses
    if (addressValidation.isContract) {
      throw new Error("Cannot transfer ALPH directly to a contract address")
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Invalid amount")
    }

    const fromAddress = this.connectedAddress || (await this.provider.getSelectedAccount())

    // Execute the transaction
    const txId = await this.provider.signAndSubmitTransferTx({
      from: fromAddress,
      to,
      amount,
    })

    return txId
  }

  // Update the transferAcyum method to validate addresses
  public async transferAcyum(to: string, amount: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error("Wallet not connected")
    }

    if (!this.provider && typeof window !== "undefined" && window.alephium) {
      this.provider = window.alephium
    }

    if (!this.provider) {
      throw new Error("No provider available")
    }

    // Validate recipient address
    const addressValidation = AlephiumUtils.validateAddress(to)
    if (!addressValidation.isValid) {
      throw new Error("Invalid recipient address")
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Invalid amount")
    }

    if (!config.alephium.acyumTokenIdHex) {
      throw new Error("ACYUM token ID not configured")
    }

    const fromAddress = this.connectedAddress || (await this.provider.getSelectedAccount())

    // Execute the transaction
    const txId = await this.provider.signAndSubmitTransferTx({
      from: fromAddress,
      to,
      amount: "0",
      tokens: [{ id: config.alephium.acyumTokenIdHex, amount }],
    })

    return txId
  }

  public async deposit(amount: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error("Wallet not connected")
    }

    if (!this.provider && typeof window !== "undefined" && window.alephium) {
      this.provider = window.alephium
    }

    if (!this.provider) {
      throw new Error("No provider available")
    }

    // Validate parameters
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Invalid amount")
    }

    if (!config.alephium.depositContractAddress) {
      throw new Error("Contract address not configured")
    }

    if (!config.alephium.acyumTokenIdHex) {
      throw new Error("ACYUM token ID not configured")
    }

    // Execute the transaction
    const txId = await this.provider.signAndSubmitExecuteScriptTx({
      bytecode: makeDepositJson.bytecodeTemplate,
      args: {
        depositContract: config.alephium.depositContractAddress,
        amount,
      },
      tokens: [{ id: config.alephium.acyumTokenIdHex, amount }],
    })

    return txId
  }

  public async withdraw(amount: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error("Wallet not connected")
    }

    if (!this.provider && typeof window !== "undefined" && window.alephium) {
      this.provider = window.alephium
    }

    if (!this.provider) {
      throw new Error("No provider available")
    }

    // Validate parameters
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error("Invalid amount")
    }

    if (!config.alephium.acyumTokenIdHex) {
      throw new Error("ACYUM token ID not configured")
    }

    // Execute the transaction
    const txId = await this.provider.signAndSubmitExecuteScriptTx({
      bytecode: withdrawJson.bytecodeTemplate,
      args: {
        token: config.alephium.acyumTokenIdHex,
        amount,
      },
    })

    return txId
  }

  public async waitForTransactionConfirmation(txId: string, confirmations = 1, timeoutMs = 60000): Promise<boolean> {
    if (!this.nodeProvider) {
      await AlephiumWeb3.initialize()
      if (!this.nodeProvider) {
        throw new Error("Node provider initialization failed")
      }
    }

    // Check if the method exists
    if (!this.nodeProvider.transactions || typeof this.nodeProvider.transactions.getTransactionsStatus !== "function") {
      console.warn("getTransactionsStatus method is not available in this version of the Alephium library")
      return false
    }

    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.nodeProvider.transactions.getTransactionsStatus({ txId })
        if (status.confirmations >= confirmations) {
          return true
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error("Error checking transaction status:", error)
        // Continue trying despite errors
      }
    }

    throw new Error("Transaction confirmation timeout")
  }

  public isConnected(): boolean {
    return this.connectionMethod !== ConnectionMethod.None && this.connectedAddress !== null
  }

  public getConnectionMethod(): ConnectionMethod {
    return this.connectionMethod
  }

  public getConnectedAddress(): string | null {
    return this.connectedAddress
  }

  public getNetworkName(): string | null {
    return this.networkName
  }

  public disconnect(): void {
    this.connectionMethod = ConnectionMethod.None
    this.connectedAddress = null
    this.provider = null
    this.networkName = null

    // Check if the method exists
    if (this.nodeProvider && typeof this.nodeProvider.setCurrentNodeProvider === "function") {
      this.nodeProvider.setCurrentNodeProvider(null)
    }

    console.log("Wallet disconnected")
  }
}

// Export WalletConnector as an alias for AlephiumWeb3
export const WalletConnector = AlephiumWeb3
