// Type definitions for Alephium wallet extension
interface Window {
  alephium?: AlephiumProvider
}

// Declare additional types for the Alephium web3 library
declare module "@alephium/web3" {
  export class NodeProvider {
    constructor(url: string)
    addresses: {
      getAddressesAddressBalance(address: string): Promise<{ balance: string }>
    }
    transactions: {
      getTransactionsStatus(params: { txId: string }): Promise<{ confirmations: number }>
    }
    verifySignature(params: { address: string; message: string; signature: string }): Promise<boolean>
    setWalletConnectConfig(config: any): void
    getCurrentNodeProvider(): NodeProvider
    connect(): Promise<AlephiumProvider>
    setCurrentNodeProvider(provider: string | null): void
  }
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
  // Transaction methods
  buildTransferTx: (params: any) => Promise<any>
  buildDeployContractTx: (params: any) => Promise<any>
  buildExecuteScriptTx: (params: any) => Promise<any>
  // Network methods
  getNetwork: () => Promise<string>
  switchNetwork: (network: string) => Promise<void>
  // Events
  on: (event: string, callback: (data: any) => void) => void
  off: (event: string, callback: (data: any) => void) => void
}
