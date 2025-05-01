"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useWallet } from '@alephium/web3-react';
import { NodeProvider } from '@alephium/web3';
// Remove deep import for AddressBalance
// import type { AddressBalance } from '@alephium/web3/dist/src/api/api-alephium'; 
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
// Import the generated wrapper for the token contract
// import { PostManager } from '../artifacts/ts/PostManager'; // Keep commented if not directly used for balance

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

// Define an interface for the expected balance response shape
interface AddressBalanceResponse {
    balance: string;
    lockedBalance?: string; // Optional
    tokenBalances?: { id: string; amount: string; lockedAmount?: string }[]; // Optional array
    utxoCount?: number; // Optional
}

interface TokenBalance {
    id: string;
    amount: string;
}

interface BalanceContextType {
  alphBalance: string | null;
  acyumBalance: string | null;
  sweaBalance: string | null; // Add sWEA balance
  isLoadingBalances: boolean;
  balanceError: string | null;
  refetchBalances: () => void;
}

const BalanceContext = createContext<BalanceContextType>({
  alphBalance: null,
  acyumBalance: null,
  sweaBalance: null, // Add sWEA balance
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
  const [sweaBalance, setSweaBalance] = useState<string | null>(null); // Add sWEA state
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Token IDs and Decimals from config
  const acyumTokenId = config.alephium.acyumTokenIdHex; // Corrected: Use acyumTokenIdHex
  const sweaTokenId = config.alephium.sweaTokenIdHex;
  const ACYUM_DECIMALS = config.alephium.acyumDecimals; // Use config
  const SWEA_DECIMALS = config.alephium.sweaDecimals; // Use config
  const ALPH_DECIMALS = 18;

  const refetchBalances = () => {
    setFetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address || !nodeProvider) {
        setAlphBalance(null);
        setAcyumBalance(null);
        setSweaBalance(null); // Reset sWEA
        setIsLoadingBalances(false);
        setBalanceError(null);
        return;
      }

      setIsLoadingBalances(true);
      setBalanceError(null);
      setAlphBalance(null);
      setAcyumBalance(null);
      setSweaBalance(null); // Reset sWEA
      logger.info(`Fetching balances for address: ${address}`);

      try {
        // Fetch ALPH and Token Balances together
        // Explicitly cast the result to include tokenBalances
        const balanceResult = await nodeProvider.addresses.getAddressesAddressBalance(address) as AddressBalanceResponse;

        logger.info("Raw balanceResult:", JSON.stringify(balanceResult, null, 2));

        // Format ALPH Balance
        const formattedAlph = formatBalance(BigInt(balanceResult.balance ?? '0'), ALPH_DECIMALS);
        setAlphBalance(formattedAlph);
        logger.info(`Fetched ALPH balance: ${formattedAlph}`);

        // Find and Format ACYUM Balance from token balances
        if (acyumTokenId && ACYUM_DECIMALS !== undefined) {
            // Type for token should now be inferred correctly
            const acyumInfo = balanceResult.tokenBalances?.find(token => token.id === acyumTokenId);
            if (acyumInfo) {
                const formattedAcyum = formatBalance(BigInt(acyumInfo.amount), ACYUM_DECIMALS);
                setAcyumBalance(formattedAcyum);
                logger.info(`Fetched ACYUM balance: ${formattedAcyum}`);
            } else {
                setAcyumBalance('0'); // Set to 0 if token not found
                logger.info(`ACYUM token (${acyumTokenId}) not found for address ${address}.`);
            }
        } else {
          setAcyumBalance(null); // Set to null if config is missing
          logger.warn("ACYUM Token ID or Decimals not configured, cannot fetch ACYUM balance.");
        }

        // Find and Format sWEA Balance from token balances
        if (sweaTokenId && SWEA_DECIMALS !== undefined) {
             // Type for token should now be inferred correctly
            const sweaInfo = balanceResult.tokenBalances?.find(token => token.id === sweaTokenId);
            if (sweaInfo) {
                const formattedSwea = formatBalance(BigInt(sweaInfo.amount), SWEA_DECIMALS);
                setSweaBalance(formattedSwea);
                logger.info(`Fetched sWEA balance: ${formattedSwea}`);
            } else {
                setSweaBalance('0'); // Set to 0 if token not found
                logger.info(`sWEA token (${sweaTokenId}) not found for address ${address}.`);
            }
        } else {
          setSweaBalance(null); // Set to null if config is missing
          logger.warn("sWEA Token ID or Decimals not configured, cannot fetch sWEA balance.");
        }

      } catch (error) {
        logger.error("Error fetching balances:", error);
        setBalanceError(error instanceof Error ? error.message : "Failed to fetch balances");
        setAlphBalance(null);
        setAcyumBalance(null);
        setSweaBalance(null); // Reset sWEA on error
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [address, isConnected, nodeProvider, acyumTokenId, sweaTokenId, ACYUM_DECIMALS, SWEA_DECIMALS, fetchTrigger]); // Add dependencies

  const contextValue = useMemo(() => ({
    alphBalance,
    acyumBalance,
    sweaBalance, // Add sWEA to context
    isLoadingBalances,
    balanceError,
    refetchBalances,
  }), [alphBalance, acyumBalance, sweaBalance, isLoadingBalances, balanceError]); // Add sWEA dependency

  return (
    <BalanceContext.Provider value={contextValue}>
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalance = () => useContext(BalanceContext); 