"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

interface EthereumContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  account: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  connect: () => Promise<void>
  disconnect: () => void
  switchToMainnet: () => Promise<void>
  usdtBalance: string | null
  isLoadingBalance: boolean
  refreshBalance: () => Promise<void>
}

const EthereumContext = createContext<EthereumContextType | undefined>(undefined)

export function useEthereum(): EthereumContextType {
  const context = useContext(EthereumContext)
  if (context === undefined) {
    throw new Error('useEthereum must be used within an EthereumProvider')
  }
  return context
}

interface EthereumProviderProps {
  children: ReactNode
}

export function EthereumProvider({ children }: EthereumProviderProps) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [chainId, setChainId] = useState<number | null>(null)
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  // USDT ABI - only need balanceOf and transfer functions
  const USDT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
  ]

  const refreshBalance = async () => {
    if (!provider || !account) return
    
    setIsLoadingBalance(true)
    try {
      const usdtContract = new ethers.Contract(
        config.ethereum.usdtContractAddress,
        USDT_ABI,
        provider
      )
      
      const balance = await usdtContract.balanceOf(account)
      const formattedBalance = ethers.formatUnits(balance, config.ethereum.usdtDecimals)
      setUsdtBalance(formattedBalance)
      logger.info(`USDT balance: ${formattedBalance}`)
    } catch (error) {
      logger.error('Error fetching USDT balance:', error)
      setUsdtBalance('0')
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to use USDT donations.')
    }

    setIsConnecting(true)
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const signer = await browserProvider.getSigner()
      const account = await signer.getAddress()
      const network = await browserProvider.getNetwork()
      
      setProvider(browserProvider)
      setSigner(signer)
      setAccount(account)
      setChainId(Number(network.chainId))
      setIsConnected(true)
      
      logger.info(`Connected to Ethereum wallet: ${account} on chain ${network.chainId}`)
      
      // Refresh balance after connection
      setTimeout(() => refreshBalance(), 1000)
      
    } catch (error) {
      logger.error('Error connecting to Ethereum wallet:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setIsConnected(false)
    setChainId(null)
    setUsdtBalance(null)
    logger.info('Disconnected from Ethereum wallet')
  }

  const switchToMainnet = async () => {
    if (!window.ethereum) return
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }], // Mainnet
      })
    } catch (error) {
      logger.error('Error switching to Ethereum mainnet:', error)
      throw error
    }
  }

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return
      
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          const browserProvider = new ethers.BrowserProvider(window.ethereum)
          const signer = await browserProvider.getSigner()
          const network = await browserProvider.getNetwork()
          
          setProvider(browserProvider)
          setSigner(signer)
          setAccount(accounts[0])
          setChainId(Number(network.chainId))
          setIsConnected(true)
          
          // Refresh balance
          setTimeout(() => refreshBalance(), 1000)
        }
      } catch (error) {
        logger.error('Error checking existing Ethereum connection:', error)
      }
    }
    
    checkConnection()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAccount(accounts[0])
        refreshBalance()
      }
    }
    
    const handleChainChanged = (chainId: string) => {
      setChainId(parseInt(chainId, 16))
    }
    
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  // Refresh balance when account or chainId changes
  useEffect(() => {
    if (account && provider) {
      refreshBalance()
    }
  }, [account, chainId])

  const value: EthereumContextType = {
    provider,
    signer,
    account,
    isConnected,
    isConnecting,
    chainId,
    connect,
    disconnect,
    switchToMainnet,
    usdtBalance,
    isLoadingBalance,
    refreshBalance,
  }

  return (
    <EthereumContext.Provider value={value}>
      {children}
    </EthereumContext.Provider>
  )
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
} 