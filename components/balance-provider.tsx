"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useWallet } from '@alephium/web3-react';
import { NodeProvider } from '@alephium/web3';
// Remove deep import for AddressBalance
// import type { AddressBalance } from '@alephium/web3/dist/src/api/api-alephium'; 
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
// Import the generated wrapper for the token contract
import { PostManager } from '../artifacts/ts/PostManager'; 

// Helper function to format balances (similar to ethers/viem formatUnits)
function formatBalance(value: bigint, decimals: number): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }
  
  // Pad fractional part with leading zeros if necessary
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  // Remove trailing zeros
  const trimmedFractional = fractionalString.replace(/0+$/, '');
  
  return `${integerPart}.${trimmedFractional}`;
}

interface TokenBalance {
    id: string;
    amount: string;
}

interface BalanceContextType {
  alphBalance: string | null;
  acyumBalance: string | null;
  isLoadingBalances: boolean;
  balanceError: string | null;
  refetchBalances: () => void;
}

const BalanceContext = createContext<BalanceContextType>({
  alphBalance: null,
  acyumBalance: null,
  isLoadingBalances: true,
  balanceError: null,
  refetchBalances: () => {},
});

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { account, connectionStatus, nodeProvider } = useWallet();
  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;

  const [alphBalance, setAlphBalance] = useState<string | null>(null);
  const [acyumBalance, setAcyumBalance] = useState<string | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const acyumContractAddress = config.alephium.acyumContractAddress;
  const ACYUM_DECIMALS = 7;
  const ALPH_DECIMALS = 18;

  const refetchBalances = () => {
    setFetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address || !nodeProvider) {
        setAlphBalance(null);
        setAcyumBalance(null);
        setIsLoadingBalances(false);
        setBalanceError(null);
        return;
      }

      setIsLoadingBalances(true);
      setBalanceError(null);
      setAlphBalance(null);
      setAcyumBalance(null);
      logger.info(`Fetching balances for address: ${address}`);

      try {
        // Fetch ALPH Balance (and potentially tokens?)
        const balanceResult = await nodeProvider.addresses.getAddressesAddressBalance(address);
        
        // --- Log the raw result to inspect its structure ---
        logger.info("Raw balanceResult:", JSON.stringify(balanceResult, null, 2)); 
        // ----------------------------------------------------
        
        // Format ALPH Balance 
        const formattedAlph = formatBalance(BigInt(balanceResult.balance ?? '0'), ALPH_DECIMALS);
        setAlphBalance(formattedAlph);
        logger.info(`Fetched ALPH balance: ${formattedAlph}`);

        // --- Keep ACYUM logic commented out for now ---
        /*
        if (acyumContractAddress) {
          try {
            // ... contract call logic ...
          } catch (tokenError: any) {
            // ... error handling ...
          }
        } else {
          setAcyumBalance(null); 
          logger.warn("ACYUM Contract Address not configured, cannot fetch ACYUM balance.");
        }
        */
        // --- Temporarily set ACYUM to null --- 
        setAcyumBalance(null);

      } catch (error) {
        logger.error("Error fetching balances:", error);
        setBalanceError(error instanceof Error ? error.message : "Failed to fetch balances");
        setAlphBalance(null);
        setAcyumBalance(null);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [address, isConnected, nodeProvider, acyumContractAddress, fetchTrigger]); 

  const contextValue = useMemo(() => ({
    alphBalance,
    acyumBalance,
    isLoadingBalances,
    balanceError,
    refetchBalances,
  }), [alphBalance, acyumBalance, isLoadingBalances, balanceError]);

  return (
    <BalanceContext.Provider value={contextValue}>
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalance = () => useContext(BalanceContext); 