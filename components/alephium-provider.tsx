"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { AlephiumWeb3 } from "@/lib/alephium"
import type { NodeProvider } from "@alephium/web3"
import { config } from "@/lib/config"
import { getAcyumTokenId } from "@/app/actions/token-actions"

interface AlephiumContextType {
  nodeProvider: NodeProvider | null
  isInitialized: boolean
  network: string
  contractAddress: string
  acyumTokenId: string
  error: string | null
}

const AlephiumContext = createContext<AlephiumContextType>({
  nodeProvider: null,
  isInitialized: false,
  network: config.alephium.network,
  contractAddress: config.alephium.contractAddress,
  acyumTokenId: "",
  error: null,
})

export function AlephiumProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlephiumContextType>({
    nodeProvider: null,
    isInitialized: false,
    network: config.alephium.network,
    contractAddress: config.alephium.contractAddress,
    acyumTokenId: "",
    error: null,
  })

  useEffect(() => {
    const initializeAlephium = async () => {
      try {
        // Try to initialize the Alephium Web3 instance
        const { nodeProvider } = await AlephiumWeb3.initialize()

        // Fetch the token ID from the server
        const tokenId = await getAcyumTokenId()

        setState({
          ...state,
          nodeProvider,
          isInitialized: true,
          acyumTokenId: tokenId,
          error: null,
        })
      } catch (error) {
        console.error("Failed to initialize Alephium providers:", error)

        // Still mark as initialized but with an error
        setState({
          ...state,
          isInitialized: true,
          error: error instanceof Error ? error.message : "Failed to initialize Alephium providers",
        })
      }
    }

    initializeAlephium()
  }, [])

  return <AlephiumContext.Provider value={state}>{children}</AlephiumContext.Provider>
}

export const useAlephium = () => useContext(AlephiumContext)
