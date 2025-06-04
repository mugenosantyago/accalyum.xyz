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
                    name: "YUM Network",
                    description: "YUM Network dApp",
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
    if (!this.nodeProvider) {
      throw new Error("Node provider not initialized.")
    }
    console.log(`Fetching balance for address: ${address}`)
    try {
      const balance = await this.nodeProvider.addresses.getAddressesAddressBalance(address)
      return balance.balance // Return ALPH balance
    } catch (error) {
      console.error(`Error fetching balance for ${address}:`, error)
      throw error
    }
  }

  public async getYumBalance(address: string): Promise<string> {
    if (!this.nodeProvider) {
      throw new Error("Node provider not initialized.")
    }
    console.log(`Fetching YUM balance for address: ${address}`)
    try {
      const balance: AddressBalance = await this.nodeProvider.addresses.getAddressesAddressBalance(address)
      let yumBalance = BigInt(0)

      // Use config.alephium.yumTokenIdHex for consistency
      const normalizedTokenId = config.alephium.yumTokenIdHex.startsWith("0x")
        ? config.alephium.yumTokenIdHex.slice(2)
        : config.alephium.yumTokenIdHex

      // Check tokenBalances array first (new structure)
      if (Array.isArray(balance.tokenBalances)) {
        const yumToken = balance.tokenBalances.find((token) => token.id === normalizedTokenId)
        if (yumToken) {
          yumBalance += BigInt(yumToken.amount)
        }
      } else if (typeof balance.tokenBalances === "object") {
        // Fallback for older API or different structure if tokenBalances is an object
        if (balance.tokenBalances[normalizedTokenId]) {
          yumBalance += BigInt(balance.tokenBalances[normalizedTokenId])
        }
      }

      // Also check locked balances
      if (Array.isArray(balance.lockedBalances)) {
        balance.lockedBalances.forEach((locked) => {
          if (locked.tokens && locked.tokens[normalizedTokenId]) {
            yumBalance += BigInt(locked.tokens[normalizedTokenId])
          }
        })
      }
      return yumBalance.toString()
    } catch (error) {
      console.error("Error fetching YUM balance:", error)
      throw error
    }
  }

  public async transfer(to: string, amount: string): Promise<string> {
    if (!this.provider || !this.connectedAddress) {
      throw new Error("Wallet not connected.")
    }

    // Validate the recipient address
    if (!AlephiumUtils.validateAddress(to).isValid) {
      throw new Error("Invalid recipient address.")
    }

    console.log(`Transferring ALPH: ${amount} to ${to}`)
    try {
      const txResult = await this.provider.signAndSubmitTransferTx({
        signerAddress: this.connectedAddress,
        destinations: [
          {
            address: to,
            attoAlphAmount: BigInt(amount),
          },
        ],
      })
      console.log(`ALPH transfer successful: Tx ID ${txResult.txId}`)
      return txResult.txId
    } catch (error) {
      console.error("Error transferring ALPH:", error)
      throw error
    }
  }

  public async transferYum(to: string, amount: string): Promise<string> {
    if (!this.provider || !this.connectedAddress) {
      throw new Error("Wallet not connected.")
    }

    // Validate the recipient address
    if (!AlephiumUtils.validateAddress(to).isValid) {
      throw new Error("Invalid recipient address.")
    }

    if (!config.alephium.yumTokenIdHex) {
      throw new Error("YUM token ID not configured")
    }
    console.log(`Transferring YUM: ${amount} to ${to}`)
    try {
      const txResult = await this.provider.signAndSubmitTransferTx({
        signerAddress: this.connectedAddress,
        destinations: [
          {
            address: to,
            attoAlphAmount: 10000n, // DUST_AMOUNT for the ALPH part of the UTXO
            tokens: [{ id: config.alephium.yumTokenIdHex, amount: BigInt(amount) }],
          },
        ],
      })
      console.log(`YUM transfer successful: Tx ID ${txResult.txId}`)
      return txResult.txId
    } catch (error) {
      console.error("Error transferring YUM:", error)
      throw error
    }
  }

  public async transferSwea(to: string, amount: string): Promise<string> {
    if (!this.provider || !this.connectedAddress) {
      throw new Error("Wallet not connected.")
    }

    // Validate the recipient address
    if (!AlephiumUtils.validateAddress(to).isValid) {
      throw new Error("Invalid recipient address.")
    }

    if (!config.alephium.sweaTokenIdHex) {
      throw new Error("sWEA token ID not configured")
    }
    console.log(`Transferring sWEA: ${amount} to ${to}`)
    try {
      const txResult = await this.provider.signAndSubmitTransferTx({
        signerAddress: this.connectedAddress,
        destinations: [
          {
            address: to,
            attoAlphAmount: 10000n, // DUST_AMOUNT for the ALPH part of the UTXO
            tokens: [{ id: config.alephium.sweaTokenIdHex, amount: BigInt(amount) }],
          },
        ],
      })
      console.log(`sWEA transfer successful: Tx ID ${txResult.txId}`)
      return txResult.txId
    } catch (error) {
      console.error("Error transferring sWEA:", error)
      throw error
    }
  }

  public async deposit(amount: string): Promise<string> {
    if (!this.provider || !this.connectedAddress) {
      throw new Error("Wallet not connected.")
    }
    if (!config.alephium.depositContractAddress) {
      throw new Error("Deposit contract address not configured.")
    }

    console.log(`Depositing ALPH: ${amount} to ${config.alephium.depositContractAddress}`)
    try {
      const txResult = await this.provider.signAndSubmitExecuteScriptTx({
        signerAddress: this.connectedAddress,
        script: makeDepositJson.bytecodeTemplate,
        attoAlphAmount: BigInt(amount),
      })
      console.log(`ALPH deposit successful: Tx ID ${txResult.txId}`)
      return txResult.txId
    } catch (error) {
      console.error("Error depositing ALPH:", error)
      throw error
    }
  }

  public async withdraw(amount: string): Promise<string> {
    if (!this.provider || !this.connectedAddress) {
      throw new Error("Wallet not connected.")
    }
    if (!config.alephium.depositContractAddress) {
      throw new Error("Deposit contract address not configured.")
    }

    console.log(`Withdrawing ALPH: ${amount} from ${config.alephium.depositContractAddress}`)
    try {
      const txResult = await this.provider.signAndSubmitExecuteScriptTx({
        signerAddress: this.connectedAddress,
        script: withdrawJson.bytecodeTemplate,
        attoAlphAmount: 0n,
        tokens: [{ id: config.alephium.yumTokenIdHex, amount: BigInt(amount) }],
      })
      console.log(`ALPH withdrawal successful: Tx ID ${txResult.txId}`)
      return txResult.txId
    } catch (error) {
      console.error("Error withdrawing ALPH:", error)
      throw error
    }
  }

  public async waitForTransactionConfirmation(
    txId: string,
    confirmations = 1,
    timeoutMs = 60000
  ): Promise<boolean> {
    if (!this.nodeProvider) {
      throw new Error("Node provider not initialized.")
    }
    console.log(`Waiting for ${confirmations} confirmations for Tx ID: ${txId}`)
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const checkConfirmation = async () => {
        try {
          const txStatus = await this.nodeProvider!.transactions.getTransactionsStatus({ txId: txId })
          if (txStatus.confirmations && txStatus.confirmations >= confirmations) {
            console.log(`Transaction ${txId} confirmed with ${txStatus.confirmations} confirmations.`)
            resolve(true)
          } else if (Date.now() - startTime > timeoutMs) {
            console.warn(`Timeout waiting for transaction ${txId} to be confirmed.`)
            resolve(false)
          } else {
            setTimeout(checkConfirmation, 4000)
          }
        } catch (error) {
          console.error(`Error checking transaction status for ${txId}:`, error)
          if (Date.now() - startTime > timeoutMs) {
            console.warn(`Timeout due to error while waiting for transaction ${txId}.`)
            resolve(false)
          } else {
            setTimeout(checkConfirmation, 4000)
          }
        }
      }
      checkConfirmation()
    })
  }

  public isConnected(): boolean {
    return this.connectionMethod !== ConnectionMethod.None && !!this.connectedAddress
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
    this.provider = null
    this.connectionMethod = ConnectionMethod.None
    this.connectedAddress = null
    this.networkName = null
    if (typeof window !== "undefined" && window.alephium) {
      // window.alephium.disconnect() // No standard disconnect method
    }
  }
}

// Export WalletConnector as an alias for AlephiumWeb3
export const WalletConnector = AlephiumWeb3
